/**
 * Geste groupé sur les signalements d'un motif (#568), sur un vrai PostgreSQL.
 *
 * La route `PATCH /api/admin/membres/:id/signalements` est une écriture admin :
 * elle doit refuser tout ce qui sort de son périmètre (autre membre, autre
 * motif, signalement déjà tranché, origine étrangère, non-admin) **sans rien
 * écrire**, et écrire tout ou rien. Les états attendus sont écrits à la main.
 * Les simulacres (session, R2, push, `after()`) viennent de `hub-membres.test.ts`.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { creerCompte, effacerPrefixe, prefixe, session } from '../aides-hub';

describe('signalements regroupés par motif (#568)', () => {
  const P = prefixe('groupe');
  let admin: string;
  let auteurs: string[];
  let n = 0;

  beforeAll(async () => {
    admin = await creerCompte(P, { pseudo: 'admin', role: 'ADMIN' });
    auteurs = await Promise.all([1, 2, 3, 4].map((i) => creerCompte(P, { pseudo: `auteur-${i}` })));
  });
  beforeEach(() => {
    session.id = admin;
  });
  afterAll(async () => {
    session.id = null;
    await effacerPrefixe(P);
  });

  const db = () => getDb();
  const cible = () => creerCompte(P, { pseudo: `cible-${++n}` });
  async function signaler(reportedId: string, reason: string, combien: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < combien; i++) {
      ids.push((await db().report.create({ data: { reporterId: auteurs[i], reportedId, reason }, select: { id: true } })).id);
    }
    return ids;
  }
  const statuts = async (ids: string[]) =>
    (await db().report.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, reviewedBy: true } }))
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      .map((r) => `${r.status}:${r.reviewedBy === admin ? 'admin' : r.reviewedBy}`);
  const journal = async (membre: string) =>
    (await db().moderationLog.findMany({ where: { targetUserId: membre }, orderBy: { createdAt: 'asc' }, select: { adminId: true, action: true, reason: true } }))
      .map((l) => ({ ...l, adminId: l.adminId === admin ? 'admin' : l.adminId }));
  const banni = async (membre: string) => (await db().user.findUniqueOrThrow({ where: { id: membre }, select: { isBanned: true } })).isBanned;

  type Entetes = Record<string, string>;
  const BONS: Entetes = { 'content-type': 'application/json', origin: 'http://localhost' };
  async function appeler(membre: string, corps: unknown, entetes: Entetes = BONS): Promise<number> {
    const { PATCH } = await import('@/app/api/admin/membres/[id]/signalements/route');
    const req = new NextRequest(`http://localhost/api/admin/membres/${membre}/signalements`, {
      method: 'PATCH',
      headers: entetes,
      body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    });
    return (await PATCH(req, { params: Promise.resolve({ id: membre }) })).status;
  }

  it.each([
    ['DISMISS_REPORT', undefined, 'dismissed', false],
    ['WARNING', undefined, 'resolved', false],
    ['BAN', 'Demande d’argent', 'resolved', true],
  ] as const)('%s : les trois signalements sont tranchés, une seule ligne de journal', async (action, reason, statut, estBanni) => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 3);
    expect(await appeler(m, { motif: 'scam', ids, action, reason })).toBe(200);
    expect(await statuts(ids)).toEqual([`${statut}:admin`, `${statut}:admin`, `${statut}:admin`]);
    expect(await banni(m)).toBe(estBanni);
    expect(await journal(m)).toEqual([{ adminId: 'admin', action, reason: reason ?? null }]);
  });

  it('la ligne de journal est celle du geste unitaire (FR-023)', async () => {
    const [a, b] = [await cible(), await cible()];
    const [seul] = await signaler(a, 'scam', 1);
    const groupe = await signaler(b, 'scam', 3);
    const { PATCH } = await import('@/app/api/admin/reports/[id]/route');
    await PATCH(new NextRequest(`http://localhost/api/admin/reports/${seul}`, { method: 'PATCH', headers: BONS, body: JSON.stringify({ action: 'BAN', reason: 'Demande d’argent' }) }), { params: Promise.resolve({ id: seul }) });
    expect(await appeler(b, { motif: 'scam', ids: groupe, action: 'BAN', reason: 'Demande d’argent' })).toBe(200);
    expect(await journal(b)).toEqual(await journal(a));
    expect(await journal(b)).toEqual([{ adminId: 'admin', action: 'BAN', reason: 'Demande d’argent' }]);
  });

  it('seuls les signalements envoyés sont tranchés : celui que le modérateur n’a pas vu reste en attente', async () => {
    const m = await cible();
    const ids = await signaler(m, 'harassment', 3);
    expect(await appeler(m, { motif: 'harassment', ids: ids.slice(0, 2), action: 'DISMISS_REPORT' })).toBe(200);
    expect(await statuts(ids)).toEqual(['dismissed:admin', 'dismissed:admin', 'pending:null']);
  });

  it('un autre motif du même membre n’est pas touché', async () => {
    const m = await cible();
    const arnaque = await signaler(m, 'scam', 2);
    const autre = await signaler(m, 'harassment', 1);
    expect(await appeler(m, { motif: 'scam', ids: arnaque, action: 'DISMISS_REPORT' })).toBe(200);
    expect(await statuts(autre)).toEqual(['pending:null']);
  });

  it('hostile — un signalement d’un autre motif glissé dans le groupe : 404, rien n’est écrit', async () => {
    const m = await cible();
    const arnaque = await signaler(m, 'scam', 2);
    const autre = await signaler(m, 'harassment', 1);
    expect(await appeler(m, { motif: 'scam', ids: [...arnaque, ...autre], action: 'BAN', reason: 'Demande d’argent' })).toBe(404);
    expect(await statuts([...arnaque, ...autre])).toEqual(['pending:null', 'pending:null', 'pending:null']);
    expect(await banni(m)).toBe(false);
    expect(await journal(m)).toEqual([]);
  });

  it('hostile — un signalement d’un autre membre : 404, ni lui ni les autres ne bougent', async () => {
    const [m, voisin] = [await cible(), await cible()];
    const miens = await signaler(m, 'scam', 2);
    const siens = await signaler(voisin, 'scam', 1);
    expect(await appeler(m, { motif: 'scam', ids: [...miens, ...siens], action: 'BAN', reason: 'Demande d’argent' })).toBe(404);
    // Et dans l'autre sens : les signalements de m sous l'adresse du voisin.
    expect(await appeler(voisin, { motif: 'scam', ids: miens, action: 'BAN', reason: 'Demande d’argent' })).toBe(404);
    expect(await statuts([...miens, ...siens])).toEqual(['pending:null', 'pending:null', 'pending:null']);
    expect([await banni(m), await banni(voisin)]).toEqual([false, false]);
    expect([...(await journal(m)), ...(await journal(voisin))]).toEqual([]);
  });

  it('hostile — un signalement déjà tranché : 409, les autres restent en attente, pas de bannissement, pas de journal de plus', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 3);
    const { traiterSignalement } = await import('@/lib/moderation/gestes');
    expect(await traiterSignalement(admin, ids[1], 'DISMISS_REPORT', null)).toBeNull();
    expect(await appeler(m, { motif: 'scam', ids, action: 'BAN', reason: 'Demande d’argent' })).toBe(409);
    expect(await statuts(ids)).toEqual(['pending:null', 'dismissed:admin', 'pending:null']);
    expect(await banni(m)).toBe(false);
    expect(await journal(m)).toEqual([{ adminId: 'admin', action: 'DISMISS_REPORT', reason: null }]);
  });

  it('le même geste envoyé deux fois : la seconde fois 409, une seule ligne de journal', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 2);
    expect(await appeler(m, { motif: 'scam', ids, action: 'WARNING' })).toBe(200);
    expect(await appeler(m, { motif: 'scam', ids, action: 'WARNING' })).toBe(409);
    expect(await journal(m)).toEqual([{ adminId: 'admin', action: 'WARNING', reason: null }]);
  });

  it('deux modérateurs en même temps : un seul geste passe, une seule ligne de journal', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 3);
    const issues = await Promise.all([
      appeler(m, { motif: 'scam', ids, action: 'DISMISS_REPORT' }),
      appeler(m, { motif: 'scam', ids, action: 'WARNING' }),
    ]);
    expect([...issues].sort()).toEqual([200, 409]);
    expect(await journal(m)).toHaveLength(1);
    expect(new Set(await statuts(ids)).size).toBe(1);
  });

  it.each([
    ['origine étrangère', { 'content-type': 'application/json', origin: 'https://exemple-hostile.test' }],
    ['origine en préfixe', { 'content-type': 'application/json', origin: 'http://localhost.exemple-hostile.test' }],
    ['origine absente', { 'content-type': 'application/json' }],
    ['formulaire en texte', { 'content-type': 'text/plain', origin: 'http://localhost' }],
  ] as const)('hostile — %s : 403, rien n’est écrit', async (_nom, entetes) => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 2);
    expect(await appeler(m, { motif: 'scam', ids, action: 'BAN', reason: 'Demande d’argent' }, entetes)).toBe(403);
    expect(await statuts(ids)).toEqual(['pending:null', 'pending:null']);
    expect(await banni(m)).toBe(false);
    expect(await journal(m)).toEqual([]);
  });

  it('hostile — un membre ordinaire, puis personne : 404 avant tout contrôle, rien n’est écrit', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 2);
    session.id = auteurs[0];
    expect(await appeler(m, { motif: 'scam', ids, action: 'BAN', reason: 'Demande d’argent' })).toBe(404);
    // Même avec une origine étrangère, un non-admin lit 404 et n'apprend rien du contrôle d'origine.
    expect(await appeler(m, { motif: 'scam', ids, action: 'DISMISS_REPORT' }, { 'content-type': 'application/json', origin: 'https://exemple-hostile.test' })).toBe(404);
    session.id = null;
    expect(await appeler(m, { motif: 'scam', ids, action: 'DISMISS_REPORT' })).toBe(404);
    expect(await statuts(ids)).toEqual(['pending:null', 'pending:null']);
    expect(await journal(m)).toEqual([]);
  });

  it('hostile — un admin rétrogradé en base ne passe plus', async () => {
    const ancien = await creerCompte(P, { pseudo: 'ancien-admin', role: 'USER' });
    const m = await cible();
    const ids = await signaler(m, 'scam', 1);
    session.id = ancien;
    expect(await appeler(m, { motif: 'scam', ids, action: 'DISMISS_REPORT' })).toBe(404);
    expect(await statuts(ids)).toEqual(['pending:null']);
  });

  it.each([
    ['bannir sans motif de la liste', (ids: string[]) => ({ motif: 'scam', ids, action: 'BAN', reason: 'parce que' })],
    ['bannir sans motif du tout', (ids: string[]) => ({ motif: 'scam', ids, action: 'BAN' })],
    ['action inconnue', (ids: string[]) => ({ motif: 'scam', ids, action: 'DELETE' })],
    ['aucun identifiant', () => ({ motif: 'scam', ids: [], action: 'DISMISS_REPORT' })],
    ['identifiant mal formé', () => ({ motif: 'scam', ids: ['1 OR 1=1'], action: 'DISMISS_REPORT' })],
    ['plus de cinquante identifiants', (ids: string[]) => ({ motif: 'scam', ids: Array.from({ length: 51 }, () => ids[0]), action: 'DISMISS_REPORT' })],
    ['sans motif de signalement', (ids: string[]) => ({ ids, action: 'DISMISS_REPORT' })],
  ] as const)('contenu refusé — %s : 400, rien n’est écrit', async (_nom, corps) => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 2);
    expect(await appeler(m, corps(ids))).toBe(400);
    expect(await statuts(ids)).toEqual(['pending:null', 'pending:null']);
    expect(await journal(m)).toEqual([]);
  });

  it('un identifiant répété ne compte pas deux fois : 404, rien n’est écrit', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 2);
    expect(await appeler(m, { motif: 'scam', ids: [ids[0], ids[0]], action: 'DISMISS_REPORT' })).toBe(404);
    expect(await statuts(ids)).toEqual(['pending:null', 'pending:null']);
  });

  it('corps illisible : 400', async () => {
    const m = await cible();
    expect(await appeler(m, '{pas du json')).toBe(400);
  });

  it('un compte admin ne se bannit pas par un groupe, mais ses signalements se classent', async () => {
    const autreAdmin = await creerCompte(P, { pseudo: 'admin-vise', role: 'ADMIN' });
    const ids = await signaler(autreAdmin, 'scam', 2);
    expect(await appeler(autreAdmin, { motif: 'scam', ids, action: 'BAN', reason: 'Demande d’argent' })).toBe(400);
    expect(await banni(autreAdmin)).toBe(false);
    expect(await statuts(ids)).toEqual(['pending:null', 'pending:null']);
    expect(await appeler(autreAdmin, { motif: 'scam', ids, action: 'DISMISS_REPORT' })).toBe(200);
    expect(await statuts(ids)).toEqual(['dismissed:admin', 'dismissed:admin']);
  });

  it('membre inconnu ou identifiant de membre mal formé : 404', async () => {
    const m = await cible();
    const ids = await signaler(m, 'scam', 1);
    expect(await appeler('00000000-0000-4000-8000-00000000dead', { motif: 'scam', ids, action: 'DISMISS_REPORT' })).toBe(404);
    expect(await appeler('pas-un-uuid', { motif: 'scam', ids, action: 'DISMISS_REPORT' })).toBe(404);
    expect(await statuts(ids)).toEqual(['pending:null']);
  });
});
