/**
 * `GET /api/admin/membres` sur un vrai PostgreSQL (spec 012, T026, T026a).
 *
 * Un jeu de comptes factices couvre chaque source de cas, chaque statut et
 * chaque niveau de fiabilité. L'ordre attendu est écrit à la main. La
 * recherche par le préfixe du jeu isole ces comptes de ceux des autres
 * fichiers. Les cas hostiles (M8, M15) tentent l'attaque et constatent le refus.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { compterCas } from '@/lib/moderation/membres';
import type { Compteurs } from '@/lib/moderation/cas';
import { creerCompte, effacerPrefixe, prefixe, session } from '../aides-hub';

const P = prefixe('liste');
const ids: Record<string, string> = {};
let admin: string;
let membreOrdinaire: string;
let avant: Compteurs;

const t = (iso: string) => new Date(iso);

async function appeler(query: Record<string, string>) {
  const { GET } = await import('@/app/api/admin/membres/route');
  const res = await GET(new NextRequest(`http://localhost/api/admin/membres?${new URLSearchParams(query)}`));
  return { status: res.status, corps: await res.json(), entetes: res.headers };
}

/** Toutes les pages, concaténées, en suivant le curseur rendu. */
async function toutesLesPages(query: Record<string, string>) {
  const noms: string[] = [];
  let curseur: string | null = null;
  let pages = 0;
  do {
    const { status, corps } = await appeler(curseur ? { ...query, curseur } : query);
    expect(status).toBe(200);
    noms.push(...corps.membres.map((m: { pseudo: string }) => m.pseudo));
    curseur = corps.curseur;
    pages++;
  } while (curseur && pages < 10);
  return { noms, pages };
}

async function signal(uid: string, type: string, force: string, createdAt: string, extra: { photoKey?: string } = {}) {
  await getDb().profileSignal.create({ data: { userId: uid, type, force, cle: `${type}-${createdAt}`, createdAt: t(createdAt), ...extra } });
}

describe('liste du hub Membres (T026, T026a)', () => {
  beforeAll(async () => {
    avant = await compterCas();
    const db = getDb();
    admin = await creerCompte(P, { pseudo: 'zz-admin', role: 'ADMIN', createdAt: t('2026-11-12T00:00:00Z') });
    membreOrdinaire = await creerCompte(P, { pseudo: 'zz-ordinaire', createdAt: t('2026-11-12T00:00:01Z') });
    const c = async (pseudo: string, o: Parameters<typeof creerCompte>[1] = { pseudo }) => {
      ids[pseudo] = await creerCompte(P, { ...o, pseudo });
      return ids[pseudo];
    };
    const auteur = await c('zz-auteur', { pseudo: '', createdAt: t('2026-11-12T00:00:02Z') });
    const report = async (uid: string, createdAt: string) =>
      db.report.create({ data: { reporterId: auteur, reportedId: uid, reason: 'scam', createdAt: t(createdAt) } });

    await report(await c('A-report-ancien', { pseudo: '', createdAt: t('2026-07-01T00:00:00Z') }), '2026-11-02T00:00:00Z');
    await report(await c('B-report-recent', { pseudo: '', createdAt: t('2026-07-02T00:00:00Z') }), '2026-11-11T00:00:00Z');
    await db.verificationRequest.create({
      data: { userId: await c('C-verif', { pseudo: '', createdAt: t('2026-07-03T00:00:00Z') }), selfieUrl: '/api/photos/x/s.jpg', createdAt: t('2026-11-05T00:00:00Z') },
    });
    await signal(await c('D-photo', { pseudo: '', photos: [`${P}/d.jpg`], createdAt: t('2026-07-04T00:00:00Z') }), 'contact_photo', 'fort', '2026-11-07T00:00:00Z', { photoKey: `${P}/d.jpg` });
    const e = await c('E-photo-voilee', { pseudo: '', photos: [`${P}/e.jpg`], createdAt: t('2026-02-01T00:00:00Z') });
    await signal(e, 'contact_photo', 'faible', '2026-11-06T00:00:00Z', { photoKey: `${P}/e.jpg` });
    // Voilée par la modération : le cas est tranché.
    await db.photoModeration.create({ data: { key: `${P}/e.jpg`, ownerId: e, sensitivity: 'suggestive', blurredKey: `${P}/e-flou.jpg`, classifiedBy: admin } });
    // Voilée par le membre lui-même : le texte de contact reste en ligne, le cas reste ouvert.
    const v = await c('V-photo-auto-voilee', { pseudo: '', photos: [`${P}/v.jpg`], createdAt: t('2026-07-10T00:00:00Z') });
    await signal(v, 'contact_photo', 'faible', '2026-11-10T00:00:00Z', { photoKey: `${P}/v.jpg` });
    await db.photoModeration.create({ data: { key: `${P}/v.jpg`, ownerId: v, sensitivity: 'suggestive', blurredKey: `${P}/v-flou.jpg` } });
    await signal(await c('F-indice', { pseudo: '', createdAt: t('2026-07-05T00:00:00Z') }), 'appareil_partage', 'faible', '2026-11-01T00:00:00Z');
    const g = await c('G-indice-tranche', { pseudo: '', createdAt: t('2026-03-01T00:00:00Z') });
    await signal(g, 'appareil_partage', 'faible', '2026-10-01T00:00:00Z');
    await db.profileReview.create({ data: { userId: g, decision: 'rien', decidedAt: t('2026-10-15T00:00:00Z') } });
    await signal(await c('H-banni', { pseudo: '', isBanned: true, createdAt: t('2026-04-01T00:00:00Z') }), 'lexique_arnaque', 'fort', '2026-11-03T00:00:00Z');
    await c('I-sans', { pseudo: '', createdAt: t('2026-01-01T00:00:00Z') });
    await signal(await c('J-douteux', { pseudo: '', createdAt: t('2026-07-06T00:00:00Z') }), 'lexique_arnaque', 'fort', '2026-11-03T00:00:00Z');
    await signal(await c('K-douteux-verifie', { pseudo: '', isVerified: true, createdAt: t('2026-07-07T00:00:00Z') }), 'lexique_arnaque', 'fort', '2026-11-04T00:00:00Z');
    await c('L-nonconf', { pseudo: '', emailVerified: null, createdAt: t('2026-05-01T00:00:00Z') });
    await c('M-retrait', { pseudo: '', retraitAt: t('2026-11-01T00:00:00Z'), createdAt: t('2026-06-01T00:00:00Z') });
    const n = await c('N-report-et-indice', { pseudo: '', createdAt: t('2026-07-08T00:00:00Z') });
    await report(n, '2026-11-09T00:00:00Z');
    await signal(n, 'profil_express', 'faible', '2025-12-01T00:00:00Z');
    // Trois faibles de types différents : douteux (FR-014 de la spec 010).
    const o = await c('O-trois-faibles', { pseudo: '', createdAt: t('2026-07-09T00:00:00Z') });
    await signal(o, 'appareil_partage', 'faible', '2026-11-08T01:00:00Z');
    await signal(o, 'fuseau_incoherent', 'faible', '2026-11-08T02:00:00Z');
    await signal(o, 'profil_express', 'faible', '2026-11-08T03:00:00Z');
    // De quoi dépasser une page : dix comptes sans cas, inscrits avant I.
    for (let i = 0; i < 10; i++) await c(`R${i}-rempli`, { pseudo: '', createdAt: t(`2025-12-${String(10 + i).padStart(2, '0')}T00:00:00Z`) });
  });
  beforeEach(() => {
    session.id = admin;
  });
  afterAll(async () => {
    session.id = null;
    await getDb().photoModeration.deleteMany({ where: { key: { startsWith: P } } });
    await effacerPrefixe(P);
  });

  it('compteurs : chaque source compte ses cas, une seule fois (FR-014)', async () => {
    const apres = await compterCas();
    const delta = Object.fromEntries(Object.entries(apres).map(([k, v]) => [k, v - avant[k as keyof Compteurs]]));
    // report : A, B, N · photo : D, V (voilée par elle-même) · indice : F, J, K, N, O (H est banni,
    // G tranché, E n'a qu'un signal de photo voilée).
    expect({ report: delta.report, photo: delta.photo, indice: delta.indice, reponse: delta.reponse }).toEqual({ report: 3, photo: 2, indice: 5, reponse: 0 });
    // Le fichier `verification-code` peut écrire des selfies en même temps :
    // on vérifie la somme sans dépendre de lui.
    expect(apres.atraiter).toBe(apres.verif + apres.report + apres.photo + apres.reponse + apres.indice);
    expect(delta.verif).toBeGreaterThanOrEqual(1);
  });

  it('tri par urgence : signalements, puis selfies et photos, puis indices, à gravité égale le plus ancien d’abord (FR-015)', async () => {
    const { noms, pages } = await toutesLesPages({ filtre: 'tous', tri: 'urgence', q: P });
    expect(pages).toBe(2);
    expect(noms).toEqual([
      'A-report-ancien', 'N-report-et-indice', 'B-report-recent',
      'C-verif', 'D-photo', 'V-photo-auto-voilee',
      'F-indice', 'J-douteux', 'K-douteux-verifie', 'O-trois-faibles',
      'R0-rempli', 'R1-rempli', 'R2-rempli', 'R3-rempli', 'R4-rempli', 'R5-rempli', 'R6-rempli', 'R7-rempli', 'R8-rempli', 'R9-rempli',
      'I-sans', 'E-photo-voilee', 'G-indice-tranche', 'H-banni', 'L-nonconf', 'M-retrait',
      'zz-admin', 'zz-ordinaire', 'zz-auteur',
    ]);
  });

  it('les cas d’un membre arrivent triés par gravité, avec leur type et leur date', async () => {
    const { corps } = await appeler({ filtre: 'tous', q: `${P}-n-report` });
    expect(corps.membres).toHaveLength(1);
    expect(corps.membres[0].cas.map((c: { type: string; gravite: string; depuis: string }) => [c.type, c.gravite, c.depuis])).toEqual([
      ['report', 'bad', '2026-11-09T00:00:00.000Z'],
      ['indice', 'info', '2025-12-01T00:00:00.000Z'],
    ]);
  });

  it('tri par inscription récente, sur deux pages, sans doublon ni oubli', async () => {
    const { noms } = await toutesLesPages({ filtre: 'tous', tri: 'recent', q: P });
    expect(noms.slice(0, 3)).toEqual(['zz-auteur', 'zz-ordinaire', 'zz-admin']);
    expect(noms.slice(-3)).toEqual(['R2-rempli', 'R1-rempli', 'R0-rempli']);
    expect(new Set(noms).size).toBe(29);
  });

  it('tri par fiabilité : douteux, puis à surveiller (le plus de signaux d’abord), puis fiables', async () => {
    const { noms } = await toutesLesPages({ filtre: 'tous', tri: 'fiabilite', q: P });
    // Douteux : O (trois signaux), puis J, D (texte de contact fort) et H
    // (banni) par inscription récente. À surveiller : N, K (vérifié, d'où un
    // cran de moins), F, E (photo voilée, signal faible).
    expect(noms.slice(0, 9)).toEqual(['O-trois-faibles', 'J-douteux', 'D-photo', 'H-banni', 'V-photo-auto-voilee', 'N-report-et-indice', 'K-douteux-verifie', 'F-indice', 'E-photo-voilee']);
  });

  it.each([
    ['atraiter', ['A-report-ancien', 'N-report-et-indice', 'B-report-recent', 'C-verif', 'D-photo', 'V-photo-auto-voilee', 'F-indice', 'J-douteux', 'K-douteux-verifie', 'O-trois-faibles']],
    ['report', ['A-report-ancien', 'N-report-et-indice', 'B-report-recent']],
    ['verif', ['C-verif']],
    ['photo', ['D-photo', 'V-photo-auto-voilee']],
    ['indice', ['N-report-et-indice', 'F-indice', 'J-douteux', 'K-douteux-verifie', 'O-trois-faibles']],
    ['reponse', []],
    ['douteux', ['D-photo', 'J-douteux', 'O-trois-faibles', 'H-banni']],
    ['verifies', ['K-douteux-verifie']],
    ['masques', ['M-retrait']],
    ['bannis', ['H-banni']],
    ['nonconf', ['L-nonconf']],
  ])('filtre %s', async (filtre, attendus) => {
    const { noms } = await toutesLesPages({ filtre, tri: 'urgence', q: P });
    expect(noms).toEqual(attendus);
  });

  it('statut et fiabilité de chaque ligne', async () => {
    const { noms } = await toutesLesPages({ filtre: 'tous', q: P });
    expect(noms).toHaveLength(29);
    const { corps } = await appeler({ filtre: 'tous', q: P, tri: 'fiabilite' });
    const par = Object.fromEntries(corps.membres.map((m: { pseudo: string; statut: string; fiabilite: string; verifie: boolean }) => [m.pseudo, [m.statut, m.fiabilite, m.verifie]]));
    expect(par['H-banni']).toEqual(['banni', 'douteux', false]);
    expect(par['K-douteux-verifie']).toEqual(['actif', 'a_surveiller', true]);
    expect(par['O-trois-faibles']).toEqual(['actif', 'douteux', false]);
    expect(par['F-indice']).toEqual(['actif', 'a_surveiller', false]);
    expect(par['M-retrait']).toEqual(['masque', 'fiable', false]);
    expect(par['L-nonconf']).toEqual(['non_confirme', 'fiable', false]);
    expect(par['G-indice-tranche']).toEqual(['actif', 'fiable', false]);
  });

  it('recherche par adresse e-mail, insensible à la casse', async () => {
    const { corps } = await appeler({ filtre: 'tous', q: `${P}-C-VERIF@EXEMPLE` });
    expect(corps.membres.map((m: { pseudo: string }) => m.pseudo)).toEqual(['C-verif']);
  });

  it('la réponse ne porte ni adresse, ni champ privé, et n’est pas mise en cache', async () => {
    const { corps, entetes } = await appeler({ filtre: 'tous', q: P });
    expect(entetes.get('cache-control')).toBe('private, no-store');
    for (const m of corps.membres) {
      expect(Object.keys(m).sort()).toEqual(['avatar', 'cas', 'fiabilite', 'id', 'inscritAt', 'pseudo', 'statut', 'verifie', 'vuLe']);
    }
    expect(JSON.stringify(corps)).not.toContain('@exemple.test');
  });

  describe('cas hostiles', () => {
    it('M8 : un membre ordinaire reçoit 404 et aucune ligne', async () => {
      session.id = membreOrdinaire;
      const { status, corps } = await appeler({ filtre: 'tous' });
      expect(status).toBe(404);
      expect(corps.membres).toBeUndefined();
    });

    it('M8 : sans session, 404', async () => {
      session.id = null;
      expect((await appeler({})).status).toBe(404);
    });

    it.each([
      ['%', 0], ['_', 0], ["'", 0], ['\\', 0], ["' OR '1'='1", 0], ['%_%', 0],
    ])('M15 : la recherche « %s » est littérale', async (q, n) => {
      const { status, corps } = await appeler({ filtre: 'tous', q: `${P}${q}` });
      expect(status).toBe(200);
      expect(corps.membres).toHaveLength(n);
    });

    it('M15 : un pseudo qui contient vraiment « % » et « _ » se trouve', async () => {
      await creerCompte(P, { pseudo: 'pct%_x', createdAt: t('2026-11-12T00:00:03Z') });
      const { corps } = await appeler({ filtre: 'tous', q: 'pct%_x' });
      expect(corps.membres.map((m: { pseudo: string }) => m.pseudo)).toEqual(['pct%_x']);
      expect((await appeler({ filtre: 'tous', q: 'pct%%x' })).corps.membres).toHaveLength(0);
    });

    it.each([
      ['forgé', Buffer.from(JSON.stringify({ tri: 'urgence', rang: 0, temps: '2026-11-08T10:00:00.000Z', id: "x' OR 1=1 --" })).toString('base64url')],
      ['tronqué', 'eyJ0cmkiOiJ1cmdlbmNlIiwicmFuZyI6'],
      ['d’un autre tri', Buffer.from(JSON.stringify({ tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id: '3f2b8c1e-1d2a-4c3b-9a8e-7f6d5c4b3a21' })).toString('base64url')],
      ['vide', ''],
    ])('M15 : curseur %s → 400', async (_c, curseur) => {
      const { status, corps } = await appeler({ filtre: 'tous', tri: 'urgence', curseur });
      expect(status).toBe(400);
      expect(corps.membres).toBeUndefined();
    });

    it.each([
      [{ filtre: 'tous; DROP TABLE users' }], [{ tri: 'id' }], [{ filtre: '__proto__' }], [{ q: 'x'.repeat(101) }],
    ])('paramètre refusé : %j', async (q) => {
      expect((await appeler(q as Record<string, string>)).status).toBe(400);
    });
  });
});
