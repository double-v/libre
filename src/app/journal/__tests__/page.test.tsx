/**
 * /journal (spec 007, US1) — la liste publique.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const fakeDb = { journalPost: { findMany: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { default: JournalPage, metadata } = await import('../page');

beforeEach(() => vi.clearAllMocks());

describe('<JournalPage />', () => {
  it('ne lit que les publiées, de la plus récente à la plus ancienne', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([]);
    render(await JournalPage());
    expect(fakeDb.journalPost.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { statut: 'publiee' },
      orderBy: { publieeAt: 'desc' },
    }));
    // Jamais le corps ni l'auteur au-delà de ce que la carte montre.
    const { select } = fakeDb.journalPost.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('auteurId');
  });

  it('une carte par publication, extrait du premier paragraphe', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([
      { slug: 'merci', titre: 'Merci !', corps: 'Premier **paragraphe**.\n\nSuite.', publieeAt: new Date('2026-09-28T10:00:00Z') },
      { slug: 'arnaques', titre: 'Arnaques', corps: 'Des conseils.', publieeAt: new Date('2026-09-26T10:00:00Z') },
    ]);
    render(await JournalPage());
    const liens = screen.getAllByRole('link', { name: /Lire la suite/ });
    expect(liens.map((a) => a.getAttribute('href'))).toEqual(['/journal/merci', '/journal/arnaques']);
    expect(screen.getByText('Premier paragraphe.')).toBeInTheDocument();
  });

  it('état vide qui se tient, sans compteur', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([]);
    const { container } = render(await JournalPage());
    expect(screen.getByText(/premières nouvelles arrivent bientôt/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/\b0\b/);
  });

  it('dans le shell public : nav invitée', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([]);
    render(await JournalPage());
    expect(screen.getByRole('link', { name: /Créer un compte/ })).toHaveAttribute('href', '/register');
  });

  it('métadonnées : titre, description, canonical', () => {
    expect(metadata.title).toMatch(/Où en est Libre/);
    expect(metadata.alternates?.canonical).toBe('https://www.getlibre.fr/journal');
  });
});
