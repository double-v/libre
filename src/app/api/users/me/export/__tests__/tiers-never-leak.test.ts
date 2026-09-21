/**
 * Garde — l'export RGPD ne divulgue jamais l'identité d'un tiers (#426).
 *
 * Art. 15.4 : le droit d'accès « ne porte pas atteinte aux droits et libertés
 * d'autrui ». Qui m'a signalé, qui m'a bloqué, qui m'a liké sans match : ces
 * identifiants appartiennent à l'autre, pas à moi — et pour un signalement,
 * les révéler expose la personne à des représailles.
 *
 * La base factice honore `select` comme Prisma : chaque ligne porte une
 * sentinelle sur les colonnes interdites, et la réponse sérialisée ne doit
 * pas la contenir. Les identifiants d'une relation **mutuelle** (match,
 * conversation, croisement) restent exportables : l'autre me connaît déjà.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  limits: { api: { limit: 60, windowMs: 60_000 } },
}));

const ME = randomUUID();
const TIERS = 'SENTINELLE-TIERS';
const MUTUEL = 'PAIR-MUTUEL';
// Ce que j'ai fait moi-même (qui j'ai liké, bloqué, signalé) reste à moi.
const CIBLE = 'MA-CIBLE';

type Args = { select?: Record<string, unknown> };
function honoreSelect<T extends Record<string, unknown>>(row: T, args?: Args) {
  if (!args?.select) return row;
  return Object.fromEntries(Object.entries(row).filter(([k]) => args.select?.[k]));
}
function table(row: Record<string, unknown>) {
  return {
    findMany: vi.fn(async (args?: Args) => [honoreSelect(row, args)]),
    findUnique: vi.fn(async (args?: Args) => honoreSelect(row, args)),
  };
}

const now = new Date('2026-09-21T10:00:00Z');
const fakeDb = {
  user: table({ id: ME, email: 'moi@example.com', displayName: 'Moi', passwordHash: 'x', createdAt: now }),
  profile: table({ userId: ME, bio: '', createdAt: now, updatedAt: now }),
  userKey: table({ publicKey: 'pk', keyCreatedAt: now }),
  like: table({ likerId: TIERS, likedId: CIBLE, createdAt: now }),
  match: table({ id: 'm', userA: MUTUEL, userB: MUTUEL, createdAt: now }),
  conversation: table({ id: 'c', userA: MUTUEL, userB: MUTUEL, createdAt: now, updatedAt: now }),
  encounter: table({ id: 'e', userA: MUTUEL, userB: MUTUEL, distanceM: 100, happenedAt: now }),
  block: table({ blockerId: TIERS, blockedId: CIBLE, createdAt: now }),
  report: table({ reporterId: TIERS, reportedId: CIBLE, reason: 'spam', description: 'd', status: 'pending', createdAt: now }),
  verificationRequest: table({ status: 'pending', createdAt: now, resolvedAt: null }),
  feedback: table({ category: 'bug', message: 'm', status: 'open', createdAt: now }),
  consent: table({ type: 'cgu', version: '1', given: true, createdAt: now, withdrawnAt: null }),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { id: ME } });
});

describe('GET /api/users/me/export — identité des tiers', () => {
  it('ne contient aucun identifiant de signaleur, bloqueur ou likeur', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const texte = await res.text();
    expect(texte).not.toContain(TIERS);
    expect(texte).not.toMatch(/"(reporterId|blockerId|likerId)"/);
  });

  it('garde les sections (existence, motif, date) et les pairs mutuels', async () => {
    const data = await (await GET()).json();
    expect(data.moderation.reportsReceived[0]).toEqual({ reason: 'spam', status: 'pending', createdAt: now.toISOString() });
    expect(data.moderation.blocksReceived[0]).toEqual({ createdAt: now.toISOString() });
    expect(data.social.receivedLikes[0]).toEqual({ createdAt: now.toISOString() });
    expect(data.moderation.reportsMade[0].reportedId).toBe(CIBLE);
    expect(data.moderation.blocksMade[0].blockedId).toBe(CIBLE);
    expect(JSON.stringify(data.social.matches)).toContain(MUTUEL);
  });
});
