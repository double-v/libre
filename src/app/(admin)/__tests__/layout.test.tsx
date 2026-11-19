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
let chemin = '/admin/membres';
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('notFound'); }, usePathname: () => chemin }));
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

/** La navigation de l'en-tête ; celle des onglets (sous 900 px) porte les mêmes entrées. */
function sidebar() {
  return within(screen.getAllByRole('navigation', { name: 'Sections du bureau' })[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  chemin = '/admin/membres';
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

  it('quatre entrées, dans l’en-tête et dans les onglets, et plus de barre latérale (#568)', async () => {
    compterCas.mockResolvedValue(cas({ atraiter: 3 }));
    fakeDb.feedback.count.mockResolvedValue(0);
    const { container } = await renderLayout();
    const navs = screen.getAllByRole('navigation', { name: 'Sections du bureau' });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/admin', '/admin/membres', '/admin/feedback', '/admin/outils']);
      expect(within(nav).getByRole('link', { name: /Membres/ })).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getAllByRole('link').filter((l) => l.hasAttribute('aria-current'))).toHaveLength(1);
    }
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelectorAll('main')).toHaveLength(1);
  });

  it.each([
    ['/admin', 'Activité'],
    ['/admin/membres', 'Membres'],
    ['/admin/feedback', 'Retours'],
    ['/admin/outils', 'Outils'],
    ['/admin/logs', 'Outils'],
    ['/admin/journal/nouveau', 'Outils'],
    // Un préfixe ne suffit pas : « /admin/membres-archives » n'est pas Membres.
    ['/admin/membres-archives', 'Outils'],
  ])('%s : l’entrée courante est %s', async (adresse, entree) => {
    chemin = adresse;
    compterCas.mockResolvedValue(cas());
    fakeDb.feedback.count.mockResolvedValue(0);
    await renderLayout();
    const courants = sidebar().getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
    expect(courants.map((l) => l.textContent)).toEqual([entree]);
  });
});
