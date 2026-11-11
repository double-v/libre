/**
 * Tests — le layout admin applique la même garde fermée que `verifyAdmin` (#547).
 *
 * Le layout décode lui-même le cookie JWT (getServerSession n'est pas fiable
 * dans un layout App Router), puis relit le rôle en base. Une base qui ne
 * répond pas ne doit pas rendre l'administration à un jeton qui dit ADMIN :
 * on attend un `notFound()` (404), comme `requireAdmin` côté API. La base et le
 * décodage du jeton sont simulés à leur frontière ; le layout est le vrai.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen } from '@testing-library/react';

const cookieGet = vi.fn();
vi.mock('next/headers', () => ({ __esModule: true, cookies: async () => ({ get: cookieGet }) }));

const decode = vi.fn();
vi.mock('next-auth/jwt', () => ({ __esModule: true, decode: (arg: unknown) => decode(arg) }));

// `notFound()` de Next lève une erreur que le routeur transforme en 404 : on
// garde ce contrat (une levée) avec un message reconnaissable.
vi.mock('next/navigation', () => ({
  __esModule: true,
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const findUnique = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { findUnique } }) }));
vi.mock('@/lib/admin-queues', () => ({
  __esModule: true,
  countAdminQueues: async () => ({ reports: 0, feedback: 0, profils: 0, verifications: 0 }),
}));
vi.mock('@/lib/fraude/indices-admin', () => ({ __esModule: true, compterGrappes: async () => 0 }));
vi.mock('@/components/ui/ThemeMenu', () => ({ __esModule: true, default: () => null }));

const { default: AdminLayout } = await import('../app/(admin)/layout');

const ID = 'compte-factice-1';
const CONTENU = 'contenu-admin-secret';

async function rendre() {
  const element = await AdminLayout({ children: <p>{CONTENU}</p> });
  render(element);
}

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test';
  cookieGet.mockImplementation((nom: string) =>
    nom === 'next-auth.session-token' ? { name: nom, value: 'jeton-factice' } : undefined,
  );
  // Le jeton affirme ADMIN dans tous les cas : seul le rôle en base doit compter.
  decode.mockResolvedValue({ sub: ID, role: 'ADMIN' });
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('layout admin — garde fermée (#547)', () => {
  it('admin réel en base → le contenu admin est rendu', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN' });
    await rendre();
    expect(screen.getByText(CONTENU)).toBeTruthy();
  });

  it('base qui lève une erreur, JWT ADMIN → 404, aucun repli sur le jeton', async () => {
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    await expect(rendre()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(screen.queryByText(CONTENU)).toBeNull();
  });

  it('rétrogradé en base alors que le JWT dit encore ADMIN → 404', async () => {
    findUnique.mockResolvedValue({ role: 'USER' });
    await expect(rendre()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(screen.queryByText(CONTENU)).toBeNull();
  });

  it('admin en base mais banni → 404', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN', isBanned: true });
    await expect(rendre()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(screen.queryByText(CONTENU)).toBeNull();
  });

  it('compte introuvable en base → 404', async () => {
    findUnique.mockResolvedValue(null);
    await expect(rendre()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('base injoignable → une ligne de journal qui dit le motif, sans identifiant ni rôle du jeton', async () => {
    findUnique.mockRejectedValue(new Error('connexion refusée'));
    await expect(rendre()).rejects.toThrow('NEXT_NOT_FOUND');
    const lignes = consoleError.mock.calls.map((args) => args.map(String).join(' '));
    expect(lignes.some((l) => l.includes('base injoignable'))).toBe(true);
    for (const l of lignes) {
      expect(l).not.toContain(ID);
      expect(l).not.toContain('ADMIN');
    }
  });
});
