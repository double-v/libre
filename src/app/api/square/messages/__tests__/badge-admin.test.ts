// @vitest-environment node
/**
 * Badge admin des messages de La Place (#552) : il vient du compte relu en
 * base, jamais du jeton. Un jeton peut être périmé (admin rétrogradé, #155)
 * ou volé.
 *
 * L'effet observé est le message tel que le magasin l'enregistre et que la
 * route le renvoie : le faux magasin ne fait que garder ce qu'on lui donne.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type Compte = { role: string | null; isBanned: boolean; squareBannedUntil: Date | null } | null;
let session: { user: { id: string; role?: string } } | null;
let compte: Compte;
const publies: Record<string, unknown>[] = [];

vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => session) }));
vi.mock('@/lib/db', () => ({
  __esModule: true,
  // La base factice honore `select`, comme une vraie : un champ oublié dans la
  // requête est absent de la réponse, au lieu d'être fourni par complaisance.
  getDb: () => ({
    user: {
      findUnique: vi.fn(async ({ select }: { select: Record<string, boolean> }) =>
        compte && Object.fromEntries(Object.entries(compte).filter(([cle]) => select[cle]))),
    },
  }),
}));
vi.mock('@/lib/features-server', () => ({ __esModule: true, gardeFeature: vi.fn(async () => null) }));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: { squareMessage: { limit: 10, windowMs: 60000 }, api: { limit: 100, windowMs: 60000 } },
}));
vi.mock('@/lib/square/reset', () => ({ __esModule: true, ensureSquareFresh: vi.fn(async () => undefined) }));
vi.mock('@/lib/square/themes-server', () => ({
  __esModule: true,
  getTodayThemeConfig: vi.fn(async () => ({ id: 'theme-factice', allowFreeText: true, options: null, maxLength: 200 })),
  getPseudonymFromConfig: vi.fn(async () => 'Renard discret'),
}));
vi.mock('@/lib/square/moderation', () => ({
  __esModule: true,
  checkContent: vi.fn(async (c: string) => ({ allowed: true, censored: c })),
}));
vi.mock('@/lib/square/store', () => ({
  __esModule: true,
  addMessage: vi.fn(async (m: Record<string, unknown>) => {
    publies.push(m);
    return { id: 'message-factice', ...m };
  }),
  getMessages: vi.fn(async () => []),
  getReactionsForMessages: vi.fn(async () => ({})),
}));

const { POST } = await import('../route');

async function publier(): Promise<{ status: number; message?: { isAdmin: boolean } }> {
  const req = new NextRequest('http://x/api/square/messages', {
    method: 'POST',
    body: JSON.stringify({ content: 'Bonsoir la Place', type: 'text' }),
  });
  const res = await POST(req);
  const corps = (await res.json()) as { message?: { isAdmin: boolean } };
  return { status: res.status, message: corps.message };
}

beforeEach(() => {
  session = null;
  compte = null;
  publies.length = 0;
});

describe('POST /api/square/messages — compte et badge décidés par la base', () => {
  it('jeton ADMIN mais rôle USER en base (admin rétrogradé) → pas de badge', async () => {
    session = { user: { id: 'u1', role: 'ADMIN' } };
    compte = { role: 'USER', isBanned: false, squareBannedUntil: null };
    const r = await publier();
    expect(r.status).toBe(201);
    expect(r.message?.isAdmin).toBe(false);
  });

  it('jeton USER mais rôle ADMIN en base (promu depuis) → badge', async () => {
    session = { user: { id: 'u1', role: 'USER' } };
    compte = { role: 'ADMIN', isBanned: false, squareBannedUntil: null };
    const r = await publier();
    expect(r.status).toBe(201);
    expect(r.message?.isAdmin).toBe(true);
  });

  it('rôle en base écrit en minuscules → badge (même règle que la garde admin)', async () => {
    session = { user: { id: 'u1' } };
    compte = { role: 'admin', isBanned: false, squareBannedUntil: null };
    expect((await publier()).message?.isAdmin).toBe(true);
  });

  it('compte banni en base, jeton encore valide → 403, rien de publié', async () => {
    session = { user: { id: 'u1', role: 'ADMIN' } };
    compte = { role: 'ADMIN', isBanned: true, squareBannedUntil: null };
    const r = await publier();
    expect(r.status).toBe(403);
    expect(r.message).toBeUndefined();
    expect(publies).toHaveLength(0);
  });

  it('compte supprimé en base, jeton encore valide → 401, rien de publié', async () => {
    session = { user: { id: 'u1', role: 'ADMIN' } };
    compte = null;
    const r = await publier();
    expect(r.status).toBe(401);
    expect(r.message).toBeUndefined();
    expect(publies).toHaveLength(0);
  });

  it('rôle absent en base → pas de badge', async () => {
    session = { user: { id: 'u1', role: 'ADMIN' } };
    compte = { role: null, isBanned: false, squareBannedUntil: null };
    expect((await publier()).message?.isAdmin).toBe(false);
  });

  it('membre ordinaire → pas de badge', async () => {
    session = { user: { id: 'u1', role: 'USER' } };
    compte = { role: 'USER', isBanned: false, squareBannedUntil: null };
    expect((await publier()).message?.isAdmin).toBe(false);
  });
});
