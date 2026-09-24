/**
 * /api/admin/journal/[id] (spec 007, US2) — lire, enregistrer, supprimer un
 * brouillon. Une publication publiée ne s'édite pas en place : sa
 * modification repasse par les garde-fous (`publier`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb, reinitialiser, nonAdmin, json, ctx, BROUILLON, ADMIN } from '../../__tests__/harnais';

const { GET, PUT, DELETE } = await import('../route');
const PUBLIEE = { ...BROUILLON, statut: 'publiee', slug: 'titre', publieeAt: new Date() };

beforeEach(reinitialiser);

describe('GET /api/admin/journal/[id]', () => {
  it('rend la publication, 404 si inconnue', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValueOnce(BROUILLON).mockResolvedValueOnce(null);
    expect((await (await GET(new Request('http://x'), ctx('p1'))).json()).post).toMatchObject({ id: 'p1' });
    expect((await GET(new Request('http://x'), ctx('zz'))).status).toBe(404);
  });
});

describe('PUT /api/admin/journal/[id]', () => {
  it('enregistre un brouillon', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue(BROUILLON);
    fakeDb.journalPost.update.mockResolvedValue({ ...BROUILLON, titre: 'Neuf' });
    const res = await PUT(json({ titre: 'Neuf', corps: 'Texte.' }, 'PUT'), ctx('p1'));
    expect(res.status).toBe(200);
    expect(fakeDb.journalPost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' }, data: { titre: 'Neuf', corps: 'Texte.' } }));
  });

  it('409 sur une publication publiée : sa modification passe par publier', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue(PUBLIEE);
    expect((await PUT(json({ titre: 'Neuf', corps: 'Texte.' }, 'PUT'), ctx('p1'))).status).toBe(409);
    expect(fakeDb.journalPost.update).not.toHaveBeenCalled();
  });

  it('400 hors bornes, 404 inconnue', async () => {
    expect((await PUT(json({ titre: '', corps: 'x' }, 'PUT'), ctx('p1'))).status).toBe(400);
    fakeDb.journalPost.findUnique.mockResolvedValue(null);
    expect((await PUT(json({ titre: 'x', corps: 'y' }, 'PUT'), ctx('zz'))).status).toBe(404);
  });
});

describe('DELETE /api/admin/journal/[id]', () => {
  it('supprime un brouillon jamais publié et le trace', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue(BROUILLON);
    expect((await DELETE(new Request('http://x'), ctx('p1'))).status).toBe(204);
    expect(fakeDb.journalPost.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: { adminId: ADMIN, targetUserId: ADMIN, action: 'DELETE_DRAFT', reason: 'post:p1' },
    });
  });

  it('409 sur ce qui a déjà été publié, même dépublié : son adresse reste réservée', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue({ ...BROUILLON, slug: 'titre', publieeAt: new Date() });
    expect((await DELETE(new Request('http://x'), ctx('p1'))).status).toBe(409);
    expect(fakeDb.journalPost.delete).not.toHaveBeenCalled();
  });

  it('refuse un non-admin (404)', async () => {
    nonAdmin();
    expect((await DELETE(new Request('http://x'), ctx('p1'))).status).toBe(404);
  });
});
