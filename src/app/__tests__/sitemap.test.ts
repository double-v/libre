/**
 * sitemap (spec 007, R6) — le journal et ses publications y figurent ; une
 * panne de lecture ne fait pas tomber le sitemap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = { journalPost: { findMany: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { default: sitemap } = await import('../sitemap');

beforeEach(() => vi.clearAllMocks());

describe('sitemap', () => {
  it('ajoute /journal et chaque publication publiée, datée de sa dernière modification', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([{ slug: 'merci', modifieeAt: new Date('2026-09-28T10:00:00Z') }]);
    const entrees = await sitemap();
    const urls = entrees.map((e) => e.url);
    expect(urls).toContain('https://www.getlibre.fr/journal');
    expect(entrees.find((e) => e.url === 'https://www.getlibre.fr/journal/merci')?.lastModified).toEqual(new Date('2026-09-28T10:00:00Z'));
    expect(fakeDb.journalPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { statut: 'publiee' } }));
  });

  it('panne de lecture : les pages fixes restent, sans les publications', async () => {
    fakeDb.journalPost.findMany.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain('https://www.getlibre.fr/register');
    expect(urls).toContain('https://www.getlibre.fr/journal');
    expect(urls.some((u) => u.startsWith('https://www.getlibre.fr/journal/'))).toBe(false);
  });
});
