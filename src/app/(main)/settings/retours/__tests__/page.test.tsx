/**
 * Paramètres › Mes retours (#477) : la réponse s'affiche sous le retour, le
 * repère de non-lu reste pendant la visite, l'ouverture marque lu et prévient
 * le point de `SiteNav`. Jamais de nombre.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FEEDBACK_READ_EVENT } from '@/lib/feedback-reply';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/settings/retours' }));

const { default: MesRetoursPage } = await import('../page');

const ITEMS = [
  {
    id: 'a', category: 'question', message: 'Je ne vois aucun profil.', createdAt: '2026-10-02T10:00:00Z',
    reply: 'Élargis ta distance.', repliedAt: '2026-10-04T10:00:00Z', unread: true,
  },
  {
    id: 'b', category: 'suggestion', message: 'Filtrer par langue.', createdAt: '2026-09-28T10:00:00Z',
    reply: null, repliedAt: null, unread: false,
  },
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn((url: string) =>
    Promise.resolve(new Response(JSON.stringify(url.endsWith('/read') ? { ok: true } : { items: ITEMS }), { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);
});

describe('<MesRetoursPage />', () => {
  it('affiche chaque retour et la réponse de l’équipe sous celui qui en a une', async () => {
    render(<MesRetoursPage />);
    expect(await screen.findByText('Élargis ta distance.')).toBeInTheDocument();
    expect(screen.getByText(/Réponse de l’équipe Libre · 4 octobre/)).toBeInTheDocument();
    expect(screen.getByText('Pas de réponse pour l’instant.')).toBeInTheDocument();
    expect(screen.getByText('Nouvelle réponse')).toBeInTheDocument();
  });

  it('marque lu et prévient la nav quand une réponse était non lue', async () => {
    const onRead = vi.fn();
    window.addEventListener(FEEDBACK_READ_EVENT, onRead);
    render(<MesRetoursPage />);
    await waitFor(() => expect(onRead).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/feedback/mine/read', { method: 'POST' });
    window.removeEventListener(FEEDBACK_READ_EVENT, onRead);
  });

  it('ne marque rien quand tout est lu', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ items: [{ ...ITEMS[0], unread: false }] }), { status: 200 })),
    );
    render(<MesRetoursPage />);
    await screen.findByText('Élargis ta distance.');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/feedback/mine/read', expect.anything());
  });

  it('ne montre aucun nombre de réponses', async () => {
    const { container } = render(<MesRetoursPage />);
    await screen.findByText('Élargis ta distance.');
    // Les seuls chiffres sont ceux des dates.
    const sansDates = container.textContent!.replace(/\d{1,2} (septembre|octobre)/g, '');
    expect(sansDates).not.toMatch(/\d/);
  });

  it('état vide : renvoie au bouton de retour et à la FAQ', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })));
    render(<MesRetoursPage />);
    expect(await screen.findByText(/aucun retour/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'foire aux questions' })).toHaveAttribute('href', '/faq');
  });
});
