/**
 * /api/admin/journal/[id]/depublier (spec 007, US2) — retirer de la page
 * publique, sans supprimer : l'adresse reste réservée.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb, reinitialiser, nonAdmin, ctx, BROUILLON, ADMIN, mockRevalidatePath } from '../../../__tests__/harnais';

const { POST } = await import('../route');
const PUBLIEE = { ...BROUILLON, statut: 'publiee', slug: 'titre', publieeAt: new Date() };
const req = () => new Request('http://x', { method: 'POST' });

beforeEach(reinitialiser);

describe('POST /api/admin/journal/[id]/depublier', () => {
  it('ramène au brouillon, trace, revalide la liste et la page', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue(PUBLIEE);
    fakeDb.journalPost.update.mockResolvedValue({ ...PUBLIEE, statut: 'brouillon' });
    expect((await POST(req(), ctx('p1'))).status).toBe(200);
    expect(fakeDb.journalPost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' }, data: { statut: 'brouillon' } }));
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: { adminId: ADMIN, targetUserId: ADMIN, action: 'UNPUBLISH_POST', reason: 'post:p1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/journal/titre');
  });

  it('409 si déjà brouillon, 404 inconnue, 404 non-admin', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValueOnce(BROUILLON).mockResolvedValueOnce(null);
    expect((await POST(req(), ctx('p1'))).status).toBe(409);
    expect((await POST(req(), ctx('zz'))).status).toBe(404);
    nonAdmin();
    expect((await POST(req(), ctx('p1'))).status).toBe(404);
    expect(fakeDb.journalPost.update).not.toHaveBeenCalled();
  });
});
