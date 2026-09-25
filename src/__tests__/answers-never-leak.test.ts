/**
 * Garde — la réponse d'autrui à une question ne sort que vers une lectrice
 * qui a répondu à la même question (spec 009, FR-004, FR-012, SC-001).
 *
 * Même base factice que `intention-never-leaks` (elle honore `select`) ; le
 * texte des réponses de la personne lue porte une sentinelle qu'on cherche
 * dans le JSON sérialisé de la fiche.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const SENTINEL = 'SENTINELLE-REPONSE';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: {
    discover: { limit: 60, windowMs: 60_000 },
    geoloc: { limit: 60, windowMs: 60_000 },
  },
}));

// --- Base factice qui applique `select` / `include` comme Prisma ------------

type Args = { select?: Record<string, unknown>; include?: Record<string, unknown> };

function shape(row: unknown, args?: Args): unknown {
  if (row === null || row === undefined || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map((r) => shape(r, args));
  const obj = row as Record<string, unknown>;
  if (args?.select) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args.select)) {
      if (v === true) out[k] = obj[k];
      else if (v && typeof v === 'object') out[k] = shape(obj[k], v as Args);
    }
    return out;
  }
  if (args?.include) {
    const out: Record<string, unknown> = { ...obj };
    for (const [k, v] of Object.entries(args.include)) {
      if (v && typeof v === 'object') out[k] = shape(obj[k], v as Args);
    }
    return out;
  }
  return obj;
}

const table = (rows: () => unknown[]) => ({
  findMany: vi.fn(async (args?: Args) => shape(rows(), args)),
  findUnique: vi.fn(async (args?: Args) => shape(rows()[0] ?? null, args)),
  findFirst: vi.fn(async (args?: Args) => shape(rows()[0] ?? null, args)),
});

const ME_ID = randomUUID();
const OTHER_ID = randomUUID();

function profileOf(userId: string, user: Record<string, unknown>) {
  return {
    userId,
    bio: 'Salut',
    birthDate: new Date('1994-01-01'),
    genderIdentity: 'femme',
    orientation: ['bi'],
    relationshipType: ['libre'],
    interests: ['Randonnée'],
    practices: [],
    practicesVisibility: 'everyone',
    photos: [],
    invisibleMode: false,
    photoSensitivityOptIn: false,
    searchGenders: [],
    searchOrientations: [],
    searchInterests: [],
    ageMin: 18,
    ageMax: 99,
    maxDistanceKm: 50,
    searchDistanceKm: null,
    lastKnownLat: 48.86,
    lastKnownLng: 2.35,
    lastGeolocAt: new Date(),
    // Les champs privés, sur TOUS les profils : ville (#402) et avancement du
    // parcours d'accueil (spec 005).
    positionSource: 'city',
    cityLabel: SENTINEL,
    onboardingStep: 1,
    user,
  };
}

function userOf(id: string, name: string) {
  const user: Record<string, unknown> = {
    id,
    displayName: name,
    isVerified: true,
    isBanned: false,
    lastActive: new Date(),
    userKey: null,
    userKeyHistory: [],
  };
  user.profile = profileOf(id, user);
  return user;
}

const me = userOf(ME_ID, 'Moi');
const other = userOf(OTHER_ID, 'Camille');

const encounter = {
  id: randomUUID(),
  userA: ME_ID,
  userB: OTHER_ID,
  latitude: 48.86,
  longitude: 2.35,
  distanceM: 300,
  happenedAt: new Date(),
  userARel: me,
  userBRel: other,
};

const match = {
  id: randomUUID(),
  userA: ME_ID,
  userB: OTHER_ID,
  createdAt: new Date(),
  userARel: me,
  userBRel: other,
  conversation: { id: randomUUID() },
};

let viewerMissing = false;
let answersFail = false;
let personAnswersFail = false;

type Row = { id: string; userId: string; questionKey: string; choices: string[]; text: string; status: string };
let rows: Row[] = [];
const answerRow = (userId: string, questionKey: string, extra: Partial<Row> = {}): Row => ({
  id: `${userId}-${questionKey}`, userId, questionKey, choices: [], text: SENTINEL, status: 'published', ...extra,
});
const profileAnswer = {
  findMany: vi.fn(async (args: { where: Record<string, unknown>; select?: Record<string, unknown> }) => {
    if (answersFail && args.where.userId === ME_ID) throw new Error('lecture impossible');
    if (personAnswersFail && args.where.userId === OTHER_ID) throw new Error('lecture impossible');
    const hit = rows.filter((r) => Object.entries(args.where).every(([k, v]) => (r as Record<string, unknown>)[k] === v));
    return hit.map((r) => shape(r, args) as Row);
  }),
};

const fakeDb = {
  user: table(() => [other]),
  // findUnique = « mon » profil ; findMany = les autres.
  profile: {
    ...table(() => [other.profile]),
    findUnique: vi.fn(async (args?: Args) => (viewerMissing ? null : shape(me.profile, args))),
  },
  block: table(() => []),
  like: table(() => []),
  match: table(() => [match]),
  encounter: table(() => [encounter]),
  photoModeration: table(() => []),
  profileAnswer,
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

/** Intention de la lectrice (« moi ») pour le test en cours. */
function viewerIntention(list: string[]) {
  (me.profile as Record<string, unknown>).relationshipType = list;
}

beforeEach(() => {
  viewerIntention(['libre']);
  viewerMissing = false;
  answersFail = false;
  personAnswersFail = false;
  rows = [];
  mockGetServerSession.mockResolvedValue({ user: { id: ME_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
});

const fiche = async (id = OTHER_ID) => {
  const { GET } = await import('@/app/api/users/[id]/route');
  const res = await GET(new Request(`http://localhost/api/users/${id}`), { params: Promise.resolve({ id }) });
  expect(res.status).toBe(200);
  const text = await res.text();
  return { text, body: JSON.parse(text) as { answers?: Array<Record<string, unknown>> } };
};

describe("les réponses d'autrui suivent le miroir question par question (spec 009)", () => {
  it('voile une réponse à une question que la lectrice n’a pas répondue', async () => {
    rows = [answerRow(OTHER_ID, 'chanson')];
    const { text, body } = await fiche();
    expect(text).not.toContain(SENTINEL);
    expect(body.answers).toEqual([expect.objectContaining({ key: 'chanson', veiled: true })]);
  });

  it('montre la réponse quand la lectrice a répondu à la même question', async () => {
    rows = [answerRow(OTHER_ID, 'chanson'), answerRow(ME_ID, 'chanson', { text: 'la mienne' })];
    const { text } = await fiche();
    expect(text).toContain(SENTINEL);
  });

  it('ne lève pas le voile avec une réponse de la lectrice retirée par la modération', async () => {
    rows = [answerRow(OTHER_ID, 'chanson'), answerRow(ME_ID, 'chanson', { text: 'x', status: 'removed' })];
    const { text } = await fiche();
    expect(text).not.toContain(SENTINEL);
  });

  it('voile tout quand les réponses de la lectrice ne peuvent pas être lues', async () => {
    rows = [answerRow(OTHER_ID, 'chanson'), answerRow(ME_ID, 'chanson')];
    answersFail = true;
    const { text } = await fiche();
    expect(text).not.toContain(SENTINEL);
  });

  it('n’envoie jamais une réponse retirée par la modération', async () => {
    rows = [answerRow(OTHER_ID, 'chanson', { status: 'removed' }), answerRow(ME_ID, 'chanson')];
    const { text, body } = await fiche();
    expect(text).not.toContain(SENTINEL);
    expect(body.answers ?? []).toEqual([]);
  });

  it('n’envoie aucun choix d’une paire « Ceci ou cela » voilée', async () => {
    rows = [answerRow(OTHER_ID, 'mer-montagne', { choices: ['mer'], text: '' })];
    const { body } = await fiche();
    expect(body.answers).toEqual([expect.objectContaining({ key: 'mer-montagne', veiled: true })]);
    expect(body.answers![0]).not.toHaveProperty('choices');
  });

  it('montre tout sur sa propre fiche', async () => {
    const self = { ...other, id: ME_ID };
    fakeDb.user.findUnique.mockResolvedValueOnce(shape(self, undefined) as never);
    rows = [answerRow(ME_ID, 'chanson')];
    const { text } = await fiche(ME_ID);
    expect(text).toContain(SENTINEL);
  });

  it('garde la fiche lisible, sans réponses, quand celles de la personne sont illisibles', async () => {
    rows = [answerRow(OTHER_ID, 'chanson'), answerRow(ME_ID, 'chanson')];
    personAnswersFail = true;
    const { text, body } = await fiche();
    expect(text).toContain('Camille');
    expect(text).not.toContain(SENTINEL);
    expect(body.answers).toBeUndefined();
  });
});
