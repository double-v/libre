/**
 * /api/admin/journal/controle (spec 007, US3) — les alertes d'un brouillon,
 * sans rien écrire.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb, reinitialiser, nonAdmin, json } from '../../__tests__/harnais';

const { POST } = await import('../route');

beforeEach(reinitialiser);

describe('POST /api/admin/journal/controle', () => {
  it('rend les alertes du titre et du corps, sans effet en base', async () => {
    const data = await (await POST(json({ titre: 'Titre', corps: 'Écris à contact@exemple.fr et @lola.' }))).json();
    expect(data.alertes.map((a: { motif: string }) => a.motif).sort()).toEqual(['courriel', 'identifiant']);
    expect(fakeDb.journalPost.update).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('400 hors bornes, 404 non-admin', async () => {
    expect((await POST(json({ titre: '', corps: 'x' }))).status).toBe(400);
    nonAdmin();
    expect((await POST(json({ titre: 'x', corps: 'y' }))).status).toBe(404);
  });
});
