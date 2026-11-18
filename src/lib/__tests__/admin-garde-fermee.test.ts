/**
 * Tests — la garde admin se ferme quand la base ne répond pas (#547).
 *
 * Le rôle fait foi en base, pas dans le JWT (#155) : un jeton peut dire encore
 * `ADMIN` après une rétrogradation, ou appartenir à une session volée. Si la
 * lecture en base échoue, on ne sait plus rien du rôle réel ; la constitution
 * (principe III) veut alors que l'accès se ferme. La base est simulée à sa
 * frontière (`getDb().user.findUnique`) ; tout le reste est le vrai code.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { NextResponse } from 'next/server';

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, getServerSession: () => getServerSession() }));
vi.mock('@/lib/auth', () => ({ __esModule: true, authOptions: {} }));

const findUnique = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { findUnique } }) }));

const { verifyAdmin, requireAdmin, isAdminSession } = await import('../admin');

const ID = 'compte-factice-1';
const EMAIL = 'factice@exemple.invalid';

/** Session dont le JWT affirme ADMIN : le cas le plus tentant pour un repli. */
function sessionJwtAdmin() {
  getServerSession.mockResolvedValue({ user: { id: ID, email: EMAIL, role: 'ADMIN' } });
}

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('verifyAdmin — le rôle en base fait foi (#155, #547)', () => {
  it('admin réel en base → session admin renvoyée', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'ADMIN' });
    await expect(verifyAdmin()).resolves.toEqual({ userId: ID, email: EMAIL, role: 'ADMIN' });
  });

  it('rôle en minuscules en base → toujours admin (comparaison insensible à la casse)', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'admin' });
    await expect(verifyAdmin()).resolves.toEqual({ userId: ID, email: EMAIL, role: 'ADMIN' });
  });

  it('rétrogradé en base alors que le JWT dit encore ADMIN → null', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'USER' });
    await expect(verifyAdmin()).resolves.toBeNull();
  });

  it('compte introuvable en base → null', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue(null);
    await expect(verifyAdmin()).resolves.toBeNull();
  });

  it('rôle absent en base → null', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: null });
    await expect(verifyAdmin()).resolves.toBeNull();
  });

  it('base qui lève une erreur, JWT ADMIN → null, aucun repli sur le jeton', async () => {
    sessionJwtAdmin();
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    await expect(verifyAdmin()).resolves.toBeNull();
  });

  it('admin en base mais banni → null (le proxy ne garde pas /api/*)', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'ADMIN', isBanned: true });
    await expect(verifyAdmin()).resolves.toBeNull();
  });

  it('pas de session → null', async () => {
    getServerSession.mockResolvedValue(null);
    findUnique.mockResolvedValue({ role: 'ADMIN' });
    await expect(verifyAdmin()).resolves.toBeNull();
  });
});

describe('requireAdmin — 404 et non 403, pour cacher la surface admin', () => {
  it('base injoignable avec JWT ADMIN → réponse 404', async () => {
    sessionJwtAdmin();
    findUnique.mockRejectedValue(new Error('délai dépassé'));
    const r = await requireAdmin();
    expect(r).toBeInstanceOf(NextResponse);
    expect((r as NextResponse).status).toBe(404);
  });

  it('rétrogradé en base avec JWT ADMIN → réponse 404', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'USER' });
    const r = await requireAdmin();
    expect((r as NextResponse).status).toBe(404);
  });

  it('admin réel → session admin, pas une réponse', async () => {
    sessionJwtAdmin();
    findUnique.mockResolvedValue({ role: 'ADMIN' });
    const r = await requireAdmin();
    expect(isAdminSession(r)).toBe(true);
  });
});

describe('journal du refus pour base injoignable (#547)', () => {
  it('une ligne qui dit le motif, sans identifiant, e-mail ni rôle du jeton', async () => {
    sessionJwtAdmin();
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    await verifyAdmin();

    const lignes = consoleError.mock.calls.map((args) => args.map(String).join(' '));
    expect(lignes.some((l) => l.includes('base injoignable'))).toBe(true);
    for (const l of lignes) {
      expect(l).not.toContain(ID);
      expect(l).not.toContain(EMAIL);
      expect(l).not.toContain('ADMIN');
    }
  });

  it('erreur Prisma à code (dérive de schéma) → le code figure au journal, pas le message', async () => {
    sessionJwtAdmin();
    findUnique.mockRejectedValue(
      Object.assign(new Error(`colonne absente pour ${ID}`), { name: 'PrismaClientKnownRequestError', code: 'P2022' }),
    );
    await expect(verifyAdmin()).resolves.toBeNull();
    const lignes = consoleError.mock.calls.map((args) => args.map(String).join(' '));
    expect(lignes).toContain('[admin/verifyAdmin] accès admin refusé : base injoignable (PrismaClientKnownRequestError P2022)');
    for (const l of lignes) expect(l).not.toContain(ID);
  });
});
