/**
 * /journal/[slug] (spec 007, US1) — une publication.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const fakeDb = { journalPost: { findFirst: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));

const { default: ArticlePage, generateMetadata } = await import('../page');
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

const POST = {
  slug: 'arnaques', titre: 'Rencontrer sans se faire arnaquer',
  corps: 'Des faux profils circulent.\n\n- on te demande de l’argent\n\n<script>x</script>',
  publieeAt: new Date('2026-09-26T08:00:00Z'), modifieeAt: new Date('2026-09-27T08:00:00Z'),
};

beforeEach(() => vi.clearAllMocks());

describe('<ArticlePage />', () => {
  it('ne cherche que parmi les publiées', async () => {
    fakeDb.journalPost.findFirst.mockResolvedValue(POST);
    await ArticlePage(params('arnaques'));
    expect(fakeDb.journalPost.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'arnaques', statut: 'publiee' } }));
  });

  it('titre, date, corps rendu, signature « L’équipe Libre »', async () => {
    fakeDb.journalPost.findFirst.mockResolvedValue(POST);
    const { container } = render(await ArticlePage(params('arnaques')));
    expect(screen.getByRole('heading', { level: 1, name: POST.titre })).toBeInTheDocument();
    expect(screen.getByText('26 septembre 2026')).toBeInTheDocument();
    expect(container.querySelector('ul li')).toHaveTextContent('on te demande de l’argent');
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('L’équipe Libre')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Toutes les nouvelles/ })).toHaveAttribute('href', '/journal');
  });

  it('introuvable, brouillon ou dépubliée → notFound', async () => {
    fakeDb.journalPost.findFirst.mockResolvedValue(null);
    await expect(ArticlePage(params('brouillon'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('métadonnées Open Graph propres à la publication', async () => {
    fakeDb.journalPost.findFirst.mockResolvedValue(POST);
    const m = await generateMetadata(params('arnaques'));
    expect(m.title).toMatch(/Rencontrer sans se faire arnaquer/);
    expect(m.description).toBe('Des faux profils circulent.');
    expect(m.alternates?.canonical).toBe('https://www.getlibre.fr/journal/arnaques');
    expect(m.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-09-26T08:00:00.000Z' });
  });

  it('métadonnées d’une adresse inconnue : rien de personnel, pas d’erreur', async () => {
    fakeDb.journalPost.findFirst.mockResolvedValue(null);
    expect((await generateMetadata(params('zz'))).title).toMatch(/Où en est Libre/);
  });
});
