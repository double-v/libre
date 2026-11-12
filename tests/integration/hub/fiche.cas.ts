/**
 * Fiche membre (spec 012, US4) sur un vrai PostgreSQL : `GET` (T035) et
 * `DELETE /api/admin/membres/[id]` (T035b).
 *
 * La fiche réunit les cas détaillés, les signaux, les photos et l'historique.
 * On vérifie le contenu exact, l'auteur de chaque ligne (ou « automatique »),
 * et qu'aucun champ privé ne sort, même vers un admin. La suppression exige
 * la ressaisie exacte du pseudo, un motif de la liste fermée et une requête
 * de la même origine (FR-S08, FR-S11, M9, M12).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { photoUrl } from '@/lib/photos';
import { creerCompte, effacerPrefixe, prefixe, session } from '../aides-hub';

const P = prefixe('fiche');
const t = (iso: string) => new Date(iso);
let admin: string;
let sam: string;
let ordinaire: string;
let julien: string;
let ines: string;
let ines2: string;
let lieDisparu: string;
let verifId: string;
let reportId: string;
let signalPhotoId: string;

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function lire(id: string) {
  const { GET } = await import('@/app/api/admin/membres/[id]/route');
  const res = await GET(new NextRequest(`http://localhost/api/admin/membres/${id}`), params(id));
  return { status: res.status, corps: await res.json(), entetes: res.headers };
}

async function supprimer(id: string, corps: unknown, entetes: Record<string, string> = { 'content-type': 'application/json', origin: 'http://localhost' }) {
  const { DELETE } = await import('@/app/api/admin/membres/[id]/route');
  const res = await DELETE(new NextRequest(`http://localhost/api/admin/membres/${id}`, { method: 'DELETE', headers: entetes, body: JSON.stringify(corps) }), params(id));
  return { status: res.status, corps: await res.json() };
}

describe('fiche membre (T035, T035b)', () => {
  beforeAll(async () => {
    const db = getDb();
    admin = await creerCompte(P, { pseudo: 'Toi', role: 'ADMIN' });
    sam = await creerCompte(P, { pseudo: 'Sam', role: 'ADMIN' });
    ordinaire = await creerCompte(P, { pseudo: 'ordinaire' });
    const auteur = await creerCompte(P, { pseudo: 'Signaleuse' });
    julien = await creerCompte(P, { pseudo: 'Julien_84', photos: [`${P}/j1.jpg`, `${P}/j2.jpg`], deviceId: 'appareil-julien', createdAt: t('2026-11-10T08:00:00Z'), lastSeenAt: t('2026-11-12T00:00:00Z') });
    await db.profile.update({ where: { userId: julien }, data: { cityLabel: 'VILLE-SENTINELLE', positionSource: 'manuelle', lastKnownLat: 43.123456, lastKnownLng: 5.654321 } });
    await db.user.update({ where: { id: julien }, data: { passwordHash: 'HASH-SENTINELLE' } });
    reportId = (await db.report.create({ data: { reporterId: auteur, reportedId: julien, reason: 'scam', description: 'Il demande 200 € pour un billet.', createdAt: t('2026-11-11T10:00:00Z') } })).id;
    await db.report.create({ data: { reporterId: ordinaire, reportedId: julien, reason: 'scam', createdAt: t('2026-11-11T11:00:00Z') } });
    await db.report.create({ data: { reporterId: sam, reportedId: julien, reason: 'scam', status: 'dismissed', createdAt: t('2026-11-01T11:00:00Z') } });
    verifId = (await db.verificationRequest.create({ data: { userId: julien, selfieUrl: `/api/photos/${julien}/selfie.jpg`, codeAttendu: '7358', codeLu: '7385', tentative: 2, createdAt: t('2026-11-11T12:00:00Z') } })).id;
    await db.verificationRequest.create({ data: { userId: julien, selfieUrl: `/api/photos/${julien}/old.jpg`, status: 'rejected', rejectReason: 'visage', createdAt: t('2026-11-09T12:00:00Z'), resolvedAt: t('2026-11-09T13:00:00Z') } });
    signalPhotoId = (await db.profileSignal.create({ data: { userId: julien, type: 'contact_photo', force: 'fort', extrait: 'snap : julien_84', photoKey: `${P}/j2.jpg`, cle: 'p', createdAt: t('2026-11-11T09:00:00Z') } })).id;
    await db.profileSignal.create({ data: { userId: julien, type: 'lexique_arnaque', force: 'fort', extrait: 'transfert', cle: 'l', createdAt: t('2026-11-11T08:00:00Z') } });
    await db.photoModeration.create({ data: { key: `${P}/j1.jpg`, ownerId: julien, sensitivity: 'suggestive', blurredKey: `${P}/j1-flou.jpg` } });
    await db.profileAnswer.create({ data: { userId: julien, questionKey: 'rire', text: 'Écris-moi sur wa', choices: [] } });
    await db.profileAnswer.create({ data: { userId: julien, questionKey: 'dimanche', text: 'Ancienne', choices: [], status: 'removed' } });
    await db.moderationLog.createMany({
      data: [
        { adminId: null, targetUserId: julien, action: 'INVITE_VERIFICATION', reason: 'lexique_arnaque', createdAt: t('2026-11-11T08:01:00Z') },
        { adminId: sam, targetUserId: julien, action: 'DISMISS_REPORT', reason: null, createdAt: t('2026-11-02T08:00:00Z') },
        { adminId: sam, targetUserId: julien, action: 'VIEW_PRIVATE_PHOTO', reason: null, createdAt: t('2026-11-03T08:00:00Z') },
      ],
    });

    // Doublon probable : Inès (confirmée) et Ines_2 (jamais confirmée), même appareil.
    ines = await creerCompte(P, { pseudo: 'Inès', deviceId: 'appareil-ines' });
    ines2 = await creerCompte(P, { pseudo: 'Ines_2', deviceId: 'appareil-ines', emailVerified: null });
    lieDisparu = await creerCompte(P, { pseudo: 'Parti' });
    await db.profileSignal.createMany({
      data: [
        { userId: ines, type: 'appareil_partage', force: 'faible', autreUserId: ines2, cle: 'a', createdAt: t('2026-11-11T07:00:00Z') },
        { userId: ines, type: 'appareil_partage', force: 'faible', autreUserId: lieDisparu, cle: 'b', createdAt: t('2026-11-11T07:30:00Z') },
      ],
    });
    await db.user.delete({ where: { id: lieDisparu } });
  });
  beforeEach(() => {
    session.id = admin;
  });
  afterAll(async () => {
    session.id = null;
    await getDb().photoModeration.deleteMany({ where: { key: { startsWith: P } } });
    await effacerPrefixe(P);
  });

  it('identité : adresse complète sur la fiche, badges, statut, fiabilité', async () => {
    const { status, corps, entetes } = await lire(julien);
    expect(status).toBe(200);
    expect(entetes.get('cache-control')).toBe('private, no-store');
    expect(corps.membre).toEqual({
      id: julien,
      pseudo: 'Julien_84',
      email: `${P}-julien_84@exemple.test`.toLowerCase(),
      inscritAt: '2026-11-10T08:00:00.000Z',
      vuLe: '2026-11-12',
      verifie: false,
      statut: 'actif',
      fiabilite: 'douteux',
      invitation: null,
      retrait: null,
      admin: false,
    });
  });

  it('cas détaillés, du plus grave au moins grave, avec le nombre de signalements en attente', async () => {
    const { corps } = await lire(julien);
    expect(corps.cas.map((c: { type: string; id: string }) => [c.type, c.id])).toEqual([
      ['report', reportId],
      ['report', expect.any(String)],
      // Même gravité : la photo (9 h) passe avant le selfie (12 h), le plus ancien d'abord.
      ['photo', signalPhotoId],
      ['verif', verifId],
      ['indice', julien],
    ]);
    const [rep] = corps.cas;
    expect(rep).toMatchObject({ motif: 'scam', motifLibelle: 'Arnaque ou demande d’argent', description: 'Il demande 200 € pour un billet.', auteur: 'Signaleuse', enAttente: 2, depuis: '2026-11-11T10:00:00.000Z' });
    const verif = corps.cas[3];
    expect(verif.verification).toMatchObject({ id: verifId, codeAttendu: '7358', codeLu: '7385', tentative: 2, refusPrecedent: { motif: 'Visage peu visible' } });
    expect(verif.verification.user.photos).toHaveLength(2);
    const photo = corps.cas[2];
    expect(photo).toMatchObject({ cle: `${P}/j2.jpg`, texteLu: 'snap : julien_84' });
    expect(photo.url).toBe(photoUrl(`${P}/j2.jpg`));
  });

  it('réponses publiées seulement, pour « Retirer la réponse »', async () => {
    const { corps } = await lire(julien);
    expect(corps.reponses.map((r: { cle: string; texte: string }) => [r.cle, r.texte])).toEqual([['rire', 'Écris-moi sur wa']]);
  });

  it('signaux non tranchés et photos avec leur voile', async () => {
    const { corps } = await lire(julien);
    expect(corps.signaux.map((s: { type: string; libelle: string; force: string }) => [s.type, s.libelle, s.force])).toEqual([
      ['contact_photo', 'Texte lu sur une photo', 'fort'],
      ['lexique_arnaque', 'Vocabulaire d’arnaque (paiement, rencontre tarifée)', 'fort'],
    ]);
    expect(corps.photos.map((p: { cle: string; voile: string | null }) => [p.cle, p.voile])).toEqual([[`${P}/j1.jpg`, 'suggestive'], [`${P}/j2.jpg`, null]]);
  });

  it('historique : auteur nommé ou « automatique », sans les simples consultations, le plus récent d’abord', async () => {
    const { corps } = await lire(julien);
    expect(corps.historique.map((h: { libelle: string; auteur: string; motif: string | null }) => [h.libelle, h.auteur, h.motif])).toEqual([
      ['Invitation à la vérification', 'automatique', 'lexique_arnaque'],
      ['Inscription', 'automatique', null],
      ['Signalement classé sans suite', 'Sam', null],
    ]);
  });

  it('aucun champ privé ne sort, même vers un admin', async () => {
    const brut = JSON.stringify((await lire(julien)).corps);
    for (const interdit of ['HASH-SENTINELLE', 'VILLE-SENTINELLE', 'appareil-julien', '43.123456', '5.654321', 'passwordHash', 'cityLabel', 'deviceId', 'lastKnownLat']) {
      expect(brut, interdit).not.toContain(interdit);
    }
  });

  it('doublon probable : le compte lié s’affiche, et la suppression vise le compte jamais confirmé (US4, scénario 2)', async () => {
    const { corps } = await lire(ines);
    const indice = corps.cas.find((c: { type: string }) => c.type === 'indice');
    expect(indice.doublon).toEqual({ id: ines2, pseudo: 'Ines_2' });
    expect(indice.lies).toEqual([
      { id: ines2, pseudo: 'Ines_2', existe: true, confirme: false },
      { id: lieDisparu, pseudo: null, existe: false, confirme: false },
    ]);
  });

  describe('cas hostiles', () => {
    it.each([['membre ordinaire', () => ordinaire], ['sans session', () => null]])('M8 : %s → 404, aucune donnée', async (_n, qui) => {
      session.id = qui();
      const { status, corps } = await lire(julien);
      expect(status).toBe(404);
      expect(corps.membre).toBeUndefined();
    });
    it.each(['pas-un-uuid', "x' OR 1=1 --", '00000000-0000-4000-8000-00000000dead'])('identifiant « %s » → 404', async (id) => {
      expect((await lire(id)).status).toBe(404);
    });
  });

  describe('DELETE (T035b)', () => {
    async function existe(id: string) {
      return (await getDb().user.count({ where: { id } })) === 1;
    }

    it('M8 : un membre ordinaire reçoit 404 avant tout autre contrôle', async () => {
      session.id = ordinaire;
      expect((await supprimer(ines2, { pseudo: 'Ines_2', motif: 'faux_profil' })).status).toBe(404);
      expect(await existe(ines2)).toBe(true);
    });

    it.each([
      ['Origin étrangère', { 'content-type': 'application/json', origin: 'https://attaquant.exemple' }],
      ['sans Origin', { 'content-type': 'application/json' }],
      ['corps texte', { 'content-type': 'text/plain', origin: 'http://localhost' }],
    ])('M9 : %s → 403, rien n’est effacé', async (_c, entetes) => {
      expect((await supprimer(ines2, { pseudo: 'Ines_2', motif: 'faux_profil' }, entetes)).status).toBe(403);
      expect(await existe(ines2)).toBe(true);
    });

    it.each([
      ['pseudo faux', { pseudo: 'Ines_3', motif: 'faux_profil' }],
      ['pseudo à la casse près', { pseudo: 'ines_2', motif: 'faux_profil' }],
      ['pseudo avec une espace', { pseudo: 'Ines_2 ', motif: 'faux_profil' }],
      ['pseudo absent', { motif: 'faux_profil' }],
      ['motif hors liste', { pseudo: 'Ines_2', motif: 'il m’énerve' }],
      ['motif absent', { pseudo: 'Ines_2' }],
    ])('M12 : %s → 400, rien n’est effacé', async (_c, corps) => {
      const r = await supprimer(ines2, corps);
      expect(r.status).toBe(400);
      expect(typeof r.corps.error).toBe('string');
      expect(await existe(ines2)).toBe(true);
    });

    it('on ne supprime pas son propre compte ici', async () => {
      expect((await supprimer(admin, { pseudo: 'Toi', motif: 'autre' })).status).toBe(400);
      expect(await existe(admin)).toBe(true);
    });

    it('compte inconnu → 404', async () => {
      expect((await supprimer('00000000-0000-4000-8000-00000000beef', { pseudo: 'x', motif: 'autre' })).status).toBe(404);
    });

    it('pseudo exact et motif de la liste : le compte disparaît, une ligne au journal de l’admin', async () => {
      const r = await supprimer(ines2, { pseudo: 'Ines_2', motif: 'faux_profil' });
      expect(r.status).toBe(200);
      expect(await existe(ines2)).toBe(false);
      const lignes = await getDb().moderationLog.findMany({ where: { adminId: admin, action: 'DELETE_USER' }, select: { targetUserId: true, reason: true } });
      expect(lignes).toEqual([{ targetUserId: admin, reason: 'Compte supprimé : faux profil' }]);
    });
  });
});
