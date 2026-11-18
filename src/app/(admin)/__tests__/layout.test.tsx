/**
 * Tests — layout admin, compteurs de files (#391 ; spec 012, T030).
 *
 * Le layout est un Server Component : il compte lui-même (pas de HTTP vers sa
 * propre API) et rend un `CountChip` à côté de Membres (tous les cas en
 * attente, mêmes chiffres que les puces du hub) et de Retours. Une file vide
 * n'affiche rien — pas un « 0 ». Le comptage SQL des cas est prouvé sur
 * PostgreSQL (`tests/integration/hub/liste.cas.ts`) ; ici, on le remplace.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { Compteurs } from '@/lib/moderation/cas';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'next-auth.session-token' ? { value: 'jwt' } : undefined) }),
}));
vi.mock('next-auth/jwt', () => ({ decode: async () => ({ sub: 'admin-1', role: 'ADMIN' }) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('notFound'); } }));
vi.mock('@/components/ui/ThemeMenu', () => ({ __esModule: true, default: () => null }));

const fakeDb = {
  user: { findUnique: vi.fn() },
  feedback: { count: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const compterCas = vi.fn<() => Promise<Compteurs>>();
vi.mock('@/lib/moderation/membres', () => ({ __esModule: true, compterCas: () => compterCas() }));

const { default: AdminLayout } = await import('../layout');

const cas = (o: Partial<Compteurs> = {}): Compteurs => ({ atraiter: 0, verif: 0, report: 0, photo: 0, reponse: 0, indice: 0, ...o });

async function renderLayout() {
  const tree = await AdminLayout({ children: <p>contenu</p> });
  return render(tree);
}

function sidebar() {
  return within(screen.getAllByRole('navigation')[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'test-secret';
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
});

describe('layout admin — compteurs', () => {
  it('Membres porte le nombre de cas à traiter, Retours le nombre de retours ouverts', async () => {
    compterCas.mockResolvedValue(cas({ atraiter: 9, report: 2, verif: 7 }));
    fakeDb.feedback.count.mockResolvedValue(1);
    await renderLayout();
    const nav = sidebar();
    expect(nav.getByRole('link', { name: /Membres/ })).toHaveTextContent(/^Membres9$/);
    expect(nav.getByRole('link', { name: /Membres/ })).toHaveAttribute('href', '/admin/membres');
    expect(nav.getByRole('link', { name: /Retours/ })).toHaveTextContent(/^Retours1$/);
    expect(fakeDb.feedback.count).toHaveBeenCalledWith({ where: { status: 'open' } });
  });

  it('les anciennes files ne sont plus dans la navigation', async () => {
    compterCas.mockResolvedValue(cas());
    fakeDb.feedback.count.mockResolvedValue(0);
    await renderLayout();
    for (const nom of [/Utilisateurs/, /Signalements/, /Vérifications/, /Indices/]) {
      expect(sidebar().queryByRole('link', { name: nom })).toBeNull();
    }
  });

  it('une file vide n’affiche aucun chiffre', async () => {
    compterCas.mockResolvedValue(cas());
    fakeDb.feedback.count.mockResolvedValue(0);
    await renderLayout();
    expect(sidebar().getByRole('link', { name: /Membres/ })).toHaveTextContent(/^Membres$/);
    expect(sidebar().getByRole('link', { name: /Retours/ })).toHaveTextContent(/^Retours$/);
  });

  it('un comptage des cas en panne ne ferme pas l’administration et laisse les retours justes', async () => {
    compterCas.mockRejectedValue(new Error('db down'));
    fakeDb.feedback.count.mockResolvedValue(4);
    await renderLayout();
    expect(screen.getAllByText('contenu').length).toBeGreaterThan(0);
    expect(sidebar().getByRole('link', { name: /Membres/ })).toHaveTextContent(/^Membres$/);
    expect(sidebar().getByRole('link', { name: /Retours/ })).toHaveTextContent(/^Retours4$/);
  });
});
