/**
 * /api/admin/journal (spec 007, US2) — liste et création de brouillons.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb, reinitialiser, nonAdmin, json, BROUILLON, ADMIN } from './harnais';

const { GET, POST } = await import('../route');

beforeEach(reinitialiser);

describe('GET /api/admin/journal', () => {
  it('liste tous les statuts, du plus récemment modifié au plus ancien', async () => {
    fakeDb.journalPost.findMany.mockResolvedValue([BROUILLON]);
    const data = await (await GET()).json();
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0]).toMatchObject({ id: 'p1', titre: 'Titre', statut: 'brouillon' });
    expect(fakeDb.journalPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { modifieeAt: 'desc' } }));
  });
});

describe('POST /api/admin/journal', () => {
  it('crée un brouillon au nom de l’admin, titre et corps nettoyés', async () => {
    fakeDb.journalPost.create.mockResolvedValue(BROUILLON);
    const res = await POST(json({ titre: '  Titre  ', corps: 'Corps propre.\n' }));
    expect(res.status).toBe(201);
    expect(fakeDb.journalPost.create).toHaveBeenCalledWith({
      data: { titre: 'Titre', corps: 'Corps propre.', statut: 'brouillon', auteurId: ADMIN },
    });
  });

  it.each([
    [{ titre: '', corps: 'x' }],
    [{ titre: 'x', corps: '   ' }],
    [{ titre: 'x'.repeat(121), corps: 'x' }],
    [{ titre: 'x', corps: 'x'.repeat(20_001) }],
    [{ titre: 42, corps: 'x' }],
  ])('400 hors bornes : %j', async (body) => {
    expect((await POST(json(body))).status).toBe(400);
    expect(fakeDb.journalPost.create).not.toHaveBeenCalled();
  });

  it('refuse un non-admin (404)', async () => {
    nonAdmin();
    expect((await GET()).status).toBe(404);
    expect((await POST(json({ titre: 'x', corps: 'y' }))).status).toBe(404);
  });
});
