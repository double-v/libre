/**
 * Scénario — modération des réponses de bout en bout (revue de la PR #466).
 *
 * Pas de maquette qui répond ce qu'on attend : un petit stockage en mémoire,
 * avec un vrai état, derrière les **vraies routes** (réponses du membre,
 * signalement, retrait et lecture admin). On rejoue ce qu'un membre et un
 * admin feraient, dans l'ordre, et on regarde l'état qui en résulte.
 *
 * Deux défauts relevés par la revue : un retrait s'annulait en renvoyant le
 * même texte ; la personne signalée pouvait effacer la preuve avant la revue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const AUTEUR = '11111111-1111-4111-8111-111111111111';
const TEMOIN = '22222222-2222-4222-8222-222222222222';
const ADMIN = '33333333-3333-4333-8333-333333333333';

let session: { user: { id: string } } | null = null;
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => session) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true, remaining: 9, resetAt: Date.now() + 1000 })),
  limits: { answers: { limit: 120, windowMs: 1 }, report: { limit: 5, windowMs: 1 } },
}));
vi.mock('@/lib/admin', () => ({
  __esModule: true,
  requireAdmin: vi.fn(async () => ({ userId: ADMIN, role: 'ADMIN' })),
  isAdminSession: () => true,
}));
vi.mock('@/lib/push/server', () => ({ __esModule: true, sendPushToAdmins: vi.fn(async () => {}), buildPayload: vi.fn(() => ({})) }));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (fn: () => unknown) => { void fn; } };
});

// --- Stockage en mémoire ------------------------------------------------------
type Answer = {
  id: string; userId: string; questionKey: string; choices: string[]; text: string; status: string;
  removedText: string | null; removedChoices: string[]; removedAt: Date | null;
};
type Report = { id: string; reporterId: string; reportedId: string; reason: string; description: string; status: string; answersSnapshot: unknown; createdAt: Date };
let answers: Answer[] = [];
let reports: Report[] = [];
let logs: Record<string, unknown>[] = [];
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

const pick = <T extends Record<string, unknown>>(row: T, select?: Record<string, unknown>) =>
  select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : { ...row };
const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => row[k] === v);

const db = {
  profileAnswer: {
    async findMany({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) {
      return answers.filter((a) => matches(a, where)).map((a) => pick(a, select));
    },
    async findUnique({ where, select }: { where: { id?: string; userId_questionKey?: { userId: string; questionKey: string } }; select?: Record<string, unknown> }) {
      const a = where.id
        ? answers.find((x) => x.id === where.id)
        : answers.find((x) => x.userId === where.userId_questionKey!.userId && x.questionKey === where.userId_questionKey!.questionKey);
      return a ? pick(a, select) : null;
    },
    async update({ where, data }: { where: { id: string }; data: Partial<Answer> }) {
      const a = answers.find((x) => x.id === where.id)!;
      Object.assign(a, data);
      return { ...a };
    },
    async upsert({ where, create, update, select }: { where: { userId_questionKey: { userId: string; questionKey: string } }; create: Partial<Answer>; update: Partial<Answer>; select?: Record<string, unknown> }) {
      const k = where.userId_questionKey;
      let a = answers.find((x) => x.userId === k.userId && x.questionKey === k.questionKey);
      if (a) Object.assign(a, update);
      else {
        a = { id: uuid(), choices: [], text: '', status: 'published', removedText: null, removedChoices: [], removedAt: null, ...create } as Answer;
        answers.push(a);
      }
      return pick(a, select);
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      const before = answers.length;
      answers = answers.filter((a) => !matches(a, where));
      return { count: before - answers.length };
    },
  },
  report: {
    async create({ data }: { data: Omit<Report, 'id' | 'createdAt' | 'answersSnapshot'> & { answersSnapshot?: unknown } }) {
      const r = { id: uuid(), createdAt: new Date(), answersSnapshot: null, ...data } as Report;
      reports.push(r);
      return r;
    },
    async findMany({ where }: { where: { status: string } }) {
      return reports.filter((r) => r.status === where.status).map((r) => ({
        ...r,
        reporter: { id: r.reporterId, displayName: 'Témoin' },
        reported: {
          id: r.reportedId, displayName: 'Auteur', isBanned: false,
          profileAnswers: answers.filter((a) => a.userId === r.reportedId && a.status === 'published')
            .map((a) => ({ id: a.id, questionKey: a.questionKey, choices: a.choices, text: a.text, removedAt: a.removedAt })),
        },
      }));
    },
    async count({ where }: { where: { status: string } }) {
      return reports.filter((r) => r.status === where.status).length;
    },
  },
  moderationLog: { async create({ data }: { data: Record<string, unknown> }) { logs.push(data); return data; } },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => db }));

// --- Gestes ------------------------------------------------------------------
const as = (id: string) => { session = { user: { id } }; };
async function repondre(key: string, text: string, choices: string[] = []) {
  as(AUTEUR);
  const { PUT } = await import('@/app/api/users/me/answers/route');
  return PUT(new Request('http://x/api/users/me/answers', { method: 'PUT', body: JSON.stringify({ key, text, choices }) }));
}
async function retirer(questionKey: string) {
  const a = answers.find((x) => x.userId === AUTEUR && x.questionKey === questionKey)!;
  const { PATCH } = await import('@/app/api/admin/answers/[id]/route');
  return PATCH(new Request(`http://x/api/admin/answers/${a.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'removed' }) }), { params: Promise.resolve({ id: a.id }) });
}
async function signaler() {
  as(TEMOIN);
  const { POST } = await import('@/app/api/moderation/report/route');
  return POST(new Request('http://x/api/moderation/report', { method: 'POST', body: JSON.stringify({ reportedId: AUTEUR, reason: 'inappropriate', description: '' }) }));
}
async function lireSignalements() {
  const { GET } = await import('@/app/api/admin/reports/route');
  return (await (await GET(new NextRequest('http://x/api/admin/reports?status=pending'))).json()).reports as Array<Record<string, any>>;
}

beforeEach(() => {
  answers = []; reports = []; logs = []; seq = 0; session = null;
});

describe('un retrait de la modération tient', () => {
  it('refuse de republier la réponse retirée à l’identique', async () => {
    expect((await repondre('fait-rire', 'Texte injurieux.')).status).toBe(200);
    expect((await retirer('fait-rire')).status).toBe(200);
    const res = await repondre('fait-rire', '  Texte   injurieux. ');
    expect(res.status).toBe(400);
    expect((await res.json()).motif).toBe('identique-retiree');
    expect(answers[0].status).toBe('removed');
  });

  it('refuse aussi les mêmes choix retirés, mais accepte l’autre option', async () => {
    await repondre('mer-montagne', '', ['mer']);
    await retirer('mer-montagne');
    expect((await repondre('mer-montagne', '', ['mer'])).status).toBe(400);
    expect((await repondre('mer-montagne', '', ['montagne'])).status).toBe(200);
  });

  it('republie une réponse différente et le signale à l’admin', async () => {
    await repondre('fait-rire', 'Texte injurieux.');
    await retirer('fait-rire');
    expect((await repondre('fait-rire', 'Les chats qui ratent leur saut.')).status).toBe(200);
    expect(answers[0]).toMatchObject({ status: 'published', text: 'Les chats qui ratent leur saut.' });
    await signaler();
    const [r] = await lireSignalements();
    expect(r.reported.profileAnswers[0].removedAt).toBeTruthy();
  });
});

describe('la preuve d’un signalement ne s’efface pas', () => {
  it('garde les réponses telles qu’au signalement, même modifiées ou supprimées ensuite', async () => {
    await repondre('fait-rire', 'Texte injurieux.');
    await repondre('chanson', 'Une chanson.');
    expect((await signaler()).status).toBe(201);
    await repondre('fait-rire', 'Texte poli.');
    as(AUTEUR);
    const { DELETE } = await import('@/app/api/users/me/answers/route');
    await DELETE(new Request('http://x/api/users/me/answers?key=chanson', { method: 'DELETE' }));

    const [r] = await lireSignalements();
    expect(r.answersSnapshot).toEqual([
      { questionKey: 'fait-rire', choices: [], text: 'Texte injurieux.' },
      { questionKey: 'chanson', choices: [], text: 'Une chanson.' },
    ]);
    expect(r.reported.profileAnswers.map((a: { text: string }) => a.text)).toEqual(['Texte poli.']);
  });

  it('ne copie pas une réponse déjà retirée par la modération', async () => {
    await repondre('fait-rire', 'Texte injurieux.');
    await retirer('fait-rire');
    await signaler();
    const [r] = await lireSignalements();
    expect(r.answersSnapshot).toEqual([]);
  });
});
