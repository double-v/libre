/**
 * /api/admin/journal/[id]/publier (spec 007, US2 + US3) — la seule porte vers
 * la page publique. Le serveur recontrôle le texte qu'il s'apprête à publier :
 * ce que l'écran a coché ne vaut rien sans ce second calcul.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeDb, reinitialiser, nonAdmin, json, ctx, BROUILLON, ADMIN, mockRevalidatePath } from '../../../__tests__/harnais';
import { controler } from '@/lib/journal/garde-fous';

const { POST } = await import('../route');

beforeEach(() => {
  reinitialiser();
  fakeDb.journalPost.findUnique.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) =>
    where.id ? BROUILLON : null);
  fakeDb.journalPost.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...BROUILLON, ...data }));
});

const propre = { titre: 'Bonne nouvelle', corps: 'Vos photos sont mieux protégées.', levees: [], reglesRelues: true };

describe('POST /api/admin/journal/[id]/publier', () => {
  it('publie un texte propre : statut, slug et date fixés, trace, revalidation', async () => {
    const res = await POST(json(propre), ctx('p1'));
    expect(res.status).toBe(200);
    const { data } = fakeDb.journalPost.update.mock.calls[0][0];
    expect(data).toMatchObject({ titre: 'Bonne nouvelle', corps: 'Vos photos sont mieux protégées.', statut: 'publiee', slug: 'bonne-nouvelle' });
    expect(data.publieeAt).toBeInstanceOf(Date);
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: { adminId: ADMIN, targetUserId: ADMIN, action: 'PUBLISH_POST', reason: 'post:p1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/journal');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/journal/bonne-nouvelle');
  });

  it('422 avec une alerte bloquante, même levée et règles relues : rien n’est écrit', async () => {
    const corps = 'Écris-nous à contact@exemple.fr.';
    const levees = controler('T', corps).map((a) => a.empreinte);
    const res = await POST(json({ titre: 'T', corps, levees, reglesRelues: true }), ctx('p1'));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.alertes[0]).toMatchObject({ motif: 'courriel', bloquante: true });
    expect(fakeDb.journalPost.update).not.toHaveBeenCalled();
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });

  it('422 si une alerte levable n’est pas levée, ou si les règles ne sont pas relues', async () => {
    expect((await POST(json({ ...propre, corps: 'Voir /api/journal.' }), ctx('p1'))).status).toBe(422);
    expect((await POST(json({ ...propre, reglesRelues: false }), ctx('p1'))).status).toBe(422);
    expect((await POST(json({ ...propre, reglesRelues: 'oui' }), ctx('p1'))).status).toBe(422);
    expect(fakeDb.journalPost.update).not.toHaveBeenCalled();
  });

  it('alertes levées : publie et trace les identifiants de règles, jamais les extraits', async () => {
    const corps = 'Voir /api/journal et @lola_privee.';
    const levees = controler('T', corps).map((a) => a.empreinte);
    expect((await POST(json({ titre: 'T', corps, levees, reglesRelues: true }), ctx('p1'))).status).toBe(200);
    const { reason } = fakeDb.moderationLog.create.mock.calls[0][0].data;
    expect(reason).toBe('post:p1 ; levees: r3,r5');
    expect(reason).not.toContain('lola');
  });

  it('republication d’une publication en ligne : UPDATE_POST, slug et date d’origine conservés', async () => {
    const origine = new Date('2026-09-01T08:00:00Z');
    fakeDb.journalPost.findUnique.mockResolvedValue({ ...BROUILLON, statut: 'publiee', slug: 'ancien-titre', publieeAt: origine });
    expect((await POST(json({ ...propre, titre: 'Nouveau titre' }), ctx('p1'))).status).toBe(200);
    const { data } = fakeDb.journalPost.update.mock.calls[0][0];
    expect(data).not.toHaveProperty('slug');
    expect(data).not.toHaveProperty('publieeAt');
    expect(fakeDb.moderationLog.create.mock.calls[0][0].data.action).toBe('UPDATE_POST');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/journal/ancien-titre');
  });

  it('slug déjà pris : suffixe -2', async () => {
    fakeDb.journalPost.findUnique.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) =>
      where.id ? BROUILLON : where.slug === 'bonne-nouvelle' ? { id: 'autre' } : null);
    await POST(json(propre), ctx('p1'));
    expect(fakeDb.journalPost.update.mock.calls[0][0].data.slug).toBe('bonne-nouvelle-2');
  });

  it('404 inconnue, 404 non-admin', async () => {
    fakeDb.journalPost.findUnique.mockResolvedValue(null);
    expect((await POST(json(propre), ctx('zz'))).status).toBe(404);
    nonAdmin();
    expect((await POST(json(propre), ctx('p1'))).status).toBe(404);
  });
});
