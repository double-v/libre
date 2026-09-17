/**
 * Tests — layout admin, compteurs de files (#391, spec 003 US3, T037).
 *
 * Le layout est un Server Component : il compte lui-même les trois files
 * (R7, pas de HTTP vers sa propre API) et rend un `CountChip` à côté de
 * Signalements, Vérifications et Retours. Une file vide n'affiche rien — pas
 * un « 0 », qui serait du bruit sur chaque entrée. La garde d'accès existante
 * (JWT + rôle en base) n'est pas re-testée ici : on la traverse en admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'next-auth.session-token' ? { value: 'jwt' } : undefined) }),
}));
vi.mock('next-auth/jwt', () => ({ decode: async () => ({ sub: 'admin-1', role: 'ADMIN' }) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('notFound'); } }));
vi.mock('@/components/ui/ThemeMenu', () => ({ __esModule: true, default: () => null }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  report: { count: vi.fn() },
  verificationRequest: { count: vi.fn() },
  feedback: { count: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { default: AdminLayout } = await import('../layout');

async function renderLayout() {
  const tree = await AdminLayout({ children: <p>contenu</p> });
  return render(tree);
}

function sidebar() {
  // Deux navs (sidebar ≥ md, bandeau mobile) rendent les mêmes entrées : on
  // vérifie la sidebar, la première dans l'arbre.
  return within(screen.getAllByRole('navigation')[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'test-secret';
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
});

describe('AdminLayout — compteurs de files', () => {
  it('affiche le nombre en attente à côté de chaque file non vide, sur son filtre de statut', async () => {
    fakeDb.report.count.mockResolvedValue(2);
    fakeDb.verificationRequest.count.mockResolvedValue(7);
    fakeDb.feedback.count.mockResolvedValue(1);
    await renderLayout();

    const nav = sidebar();
    expect(nav.getByRole('link', { name: /Signalements/ })).toHaveTextContent('2');
    expect(nav.getByRole('link', { name: /Vérifications/ })).toHaveTextContent('7');
    expect(nav.getByRole('link', { name: /Retours/ })).toHaveTextContent('1');
    expect(fakeDb.report.count).toHaveBeenCalledWith({ where: { status: 'pending' } });
    expect(fakeDb.verificationRequest.count).toHaveBeenCalledWith({ where: { status: 'pending' } });
    expect(fakeDb.feedback.count).toHaveBeenCalledWith({ where: { status: 'open' } });
  });

  it("n'affiche rien — pas même un 0 — à côté d'une file vide", async () => {
    fakeDb.report.count.mockResolvedValue(0);
    fakeDb.verificationRequest.count.mockResolvedValue(3);
    fakeDb.feedback.count.mockResolvedValue(0);
    await renderLayout();

    const nav = sidebar();
    expect(nav.getByRole('link', { name: /Signalements/ })).toHaveTextContent(/^Signalements$/);
    expect(nav.getByRole('link', { name: /Retours/ })).toHaveTextContent(/^Retours$/);
    expect(nav.getByRole('link', { name: /Vérifications/ })).toHaveTextContent('3');
    // Les entrées sans file (Utilisateurs, Logs…) ne portent jamais de chip.
    expect(nav.getByRole('link', { name: /Utilisateurs/ })).toHaveTextContent(/^Utilisateurs$/);
  });

  it('un échec de comptage ne bloque pas l’administration : entrées sans chip', async () => {
    fakeDb.report.count.mockRejectedValue(new Error('db down'));
    fakeDb.verificationRequest.count.mockResolvedValue(3);
    fakeDb.feedback.count.mockResolvedValue(0);
    await renderLayout();
    // Le contenu est rendu deux fois (main mobile + main desktop).
    expect(screen.getAllByText('contenu').length).toBeGreaterThan(0);
    expect(sidebar().getByRole('link', { name: /Signalements/ })).toHaveTextContent(/^Signalements$/);
  });
});
