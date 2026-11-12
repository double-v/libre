// @vitest-environment node
/**
 * Gestes de modération extraits des routes (spec 012, T003, FR-023).
 *
 * Chaque geste est joué deux fois sur un vrai PostgreSQL : par sa route
 * actuelle, puis par la fonction sans HTTP de `src/lib/moderation/gestes.ts`
 * que le hub appellera. Les deux chemins doivent laisser **le même effet en
 * base et la même ligne de journal**, écrits ici à la main, jamais recalculés.
 * Seules les frontières qu'on ne contrôle pas sont simulées : la session
 * (next-auth), le stockage R2, le push et `after()`.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { creerCompte, effacerPrefixe, prefixe } from './aides-hub';

let sessionId: string | null = null;
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => (sessionId ? { user: { id: sessionId } } : null)) }));
const r2Effaces: string[] = [];
vi.mock('@/lib/r2', async () => ({
  ...(await vi.importActual<typeof import('@/lib/r2')>('@/lib/r2')),
  deletePhoto: async (k: string) => { r2Effaces.push(k); },
  isR2Configured: () => false,
}));
vi.mock('@/lib/push/server', async () => ({
  ...(await vi.importActual<typeof import('@/lib/push/server')>('@/lib/push/server')),
  sendPushToUser: async () => {},
}));
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: () => {},
}));

const P = prefixe('gestes');
let admin: string;

beforeAll(async () => {
  admin = await creerCompte(P, { pseudo: 'admin', role: 'ADMIN' });
  sessionId = admin;
});
afterAll(async () => {
  sessionId = null;
  await effacerPrefixe(P);
});

const db = () => getDb();
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
function req(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** Les lignes de journal d'un compte, sans identifiant ni date : ce qui doit être identique. */
async function journal(cible: string) {
  const lignes = await db().moderationLog.findMany({
    where: { targetUserId: cible },
    orderBy: { createdAt: 'asc' },
    select: { adminId: true, action: true, reason: true },
  });
  return lignes.map((l) => ({ ...l, adminId: l.adminId === admin ? 'admin' : l.adminId }));
}

async function signalement(cible: string): Promise<string> {
  const auteur = await creerCompte(P, { pseudo: `auteur-${Math.random().toString(36).slice(2, 7)}` });
  const r = await db().report.create({ data: { reporterId: auteur, reportedId: cible, reason: 'scam' }, select: { id: true } });
  return r.id;
}

type Chemin = 'route' | 'fonction';
const CHEMINS: Chemin[] = ['route', 'fonction'];

describe.each(CHEMINS)('signalement, par la %s', (chemin) => {
  async function traiter(id: string, action: 'DISMISS_REPORT' | 'BAN' | 'WARNING', reason?: string) {
    if (chemin === 'route') {
      const { PATCH } = await import('@/app/api/admin/reports/[id]/route');
      return (await PATCH(req(`/api/admin/reports/${id}`, 'PATCH', { action, reason }), params({ id }))).status;
    }
    const { traiterSignalement } = await import('@/lib/moderation/gestes');
    return (await traiterSignalement(admin, id, action, reason ?? null)) ?? 200;
  }

  it.each([
    ['DISMISS_REPORT', 'dismissed', false],
    ['WARNING', 'resolved', false],
    ['BAN', 'resolved', true],
  ] as const)('%s : statut %s, bannissement %s, une ligne de journal', async (action, statut, banni) => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-${action}` });
    const id = await signalement(cible);
    expect(await traiter(id, action, action === 'BAN' ? 'Demande d’argent' : undefined)).toBe(200);
    const r = await db().report.findUniqueOrThrow({ where: { id }, select: { status: true, reviewedBy: true, resolvedAt: true } });
    expect(r.status).toBe(statut);
    expect(r.reviewedBy).toBe(admin);
    expect(r.resolvedAt).not.toBeNull();
    expect((await db().user.findUniqueOrThrow({ where: { id: cible }, select: { isBanned: true } })).isBanned).toBe(banni);
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action, reason: action === 'BAN' ? 'Demande d’argent' : null }]);
  });

  it('signalement inconnu : rien n’est écrit', async () => {
    const avant = await db().moderationLog.count({ where: { adminId: admin } });
    const inconnu = '00000000-0000-4000-8000-000000000001';
    expect(chemin === 'route' ? await traiter(inconnu, 'BAN') : await traiter(inconnu, 'BAN')).toBe(chemin === 'route' ? 404 : 'introuvable');
    expect(await db().moderationLog.count({ where: { adminId: admin } })).toBe(avant);
  });
});

describe.each(CHEMINS)('vérification, par la %s', (chemin) => {
  async function decider(id: string, action: 'APPROVE_VERIFICATION' | 'REJECT_VERIFICATION', motif?: 'code') {
    if (chemin === 'route') {
      const { PATCH } = await import('@/app/api/admin/verifications/[id]/route');
      return (await PATCH(req(`/api/admin/verifications/${id}`, 'PATCH', { action, motif }), params({ id }))).status;
    }
    const { deciderVerification } = await import('@/lib/moderation/gestes');
    const r = await deciderVerification(admin, id, action === 'APPROVE_VERIFICATION' ? { action } : { action, motif: motif! });
    return typeof r === 'string' ? r : 200;
  }

  async function demande(cible: string): Promise<string> {
    const v = await db().verificationRequest.create({ data: { userId: cible, selfieUrl: `/api/photos/${cible}/selfie.jpg`, codeAttendu: '2345' }, select: { id: true } });
    return v.id;
  }

  it('valider : badge posé, retrait et invitation levés, une ligne de journal', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-valide`, retraitAt: new Date(), verifInviteeAt: new Date() });
    const id = await demande(cible);
    expect(await decider(id, 'APPROVE_VERIFICATION')).toBe(200);
    expect(await db().verificationRequest.findUniqueOrThrow({ where: { id }, select: { status: true, reviewedBy: true } })).toEqual({ status: 'approved', reviewedBy: admin });
    expect(await db().user.findUniqueOrThrow({ where: { id: cible }, select: { isVerified: true, retraitAt: true, verifInviteeAt: true } }))
      .toEqual({ isVerified: true, retraitAt: null, verifInviteeAt: null });
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action: 'APPROVE_VERIFICATION', reason: null }]);
  });

  it('refuser : motif gardé, signal posé après une invitation, puis une seconde décision est refusée', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-refuse`, verifInviteeAt: new Date() });
    const id = await demande(cible);
    expect(await decider(id, 'REJECT_VERIFICATION', 'code')).toBe(200);
    expect(await db().verificationRequest.findUniqueOrThrow({ where: { id }, select: { status: true, rejectReason: true } })).toEqual({ status: 'rejected', rejectReason: 'code' });
    expect(await db().profileSignal.count({ where: { userId: cible, type: 'verification_refusee' } })).toBe(1);
    expect(await decider(id, 'APPROVE_VERIFICATION')).toBe(chemin === 'route' ? 409 : 'deja_traite');
    expect((await db().user.findUniqueOrThrow({ where: { id: cible }, select: { isVerified: true } })).isVerified).toBe(false);
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action: 'REJECT_VERIFICATION', reason: 'code' }]);
  });
});

describe.each(CHEMINS)('réponse, par la %s', (chemin) => {
  it('retirer : la réponse passe « removed », son texte est gardé, le journal porte la question', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-reponse` });
    const a = await db().profileAnswer.create({ data: { userId: cible, questionKey: 'rire', text: 'Écris-moi ailleurs', choices: [] }, select: { id: true } });
    if (chemin === 'route') {
      const { PATCH } = await import('@/app/api/admin/answers/[id]/route');
      expect((await PATCH(req(`/api/admin/answers/${a.id}`, 'PATCH', { status: 'removed' }), params({ id: a.id }))).status).toBe(200);
    } else {
      const { retirerReponse } = await import('@/lib/moderation/gestes');
      expect(await retirerReponse(admin, a.id)).toBeNull();
    }
    const apres = await db().profileAnswer.findUniqueOrThrow({ where: { id: a.id }, select: { status: true, removedText: true, removedAt: true } });
    expect(apres.status).toBe('removed');
    expect(apres.removedText).toBe('Écris-moi ailleurs');
    expect(apres.removedAt).not.toBeNull();
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action: 'REMOVE_ANSWER', reason: 'rire' }]);
  });
});

describe.each(CHEMINS)('photo, par la %s', (chemin) => {
  it('retirer : la photo quitte le profil dans l’ordre, l’objet R2 est effacé, une ligne de journal', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-photo`, photos: [`${P}/a.jpg`, `${P}/${chemin}.jpg`, `${P}/c.jpg`] });
    const cle = `${P}/${chemin}.jpg`;
    if (chemin === 'route') {
      const { DELETE } = await import('@/app/api/admin/users/[id]/photos/route');
      expect((await DELETE(req(`/api/admin/users/${cible}/photos`, 'DELETE', { photoKey: cle, reason: 'Pseudo de réseau social' }), params({ id: cible }))).status).toBe(200);
    } else {
      const { retirerPhoto } = await import('@/lib/moderation/gestes');
      expect(await retirerPhoto(admin, cible, cle, 'Pseudo de réseau social')).toEqual({ photos: [`${P}/a.jpg`, `${P}/c.jpg`] });
    }
    expect((await db().profile.findUniqueOrThrow({ where: { userId: cible }, select: { photos: true } })).photos).toEqual([`${P}/a.jpg`, `${P}/c.jpg`]);
    expect(r2Effaces).toContain(cle);
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action: 'REMOVE_PHOTO', reason: 'Pseudo de réseau social' }]);
  });
});

describe.each(CHEMINS)('bannissement, par la %s', (chemin) => {
  async function bannir(id: string, banned: boolean, reason?: string) {
    if (chemin === 'route') {
      const { PATCH } = await import('@/app/api/admin/users/[id]/route');
      return (await PATCH(req(`/api/admin/users/${id}`, 'PATCH', { banned, reason }), params({ id }))).status;
    }
    const { changerBannissement } = await import('@/lib/moderation/gestes');
    return (await changerBannissement(admin, id, banned, reason ?? null)) ?? 200;
  }

  it('bannir puis débannir : deux lignes, dans l’ordre', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-bannissement` });
    expect(await bannir(cible, true, 'Faux profil')).toBe(200);
    expect((await db().user.findUniqueOrThrow({ where: { id: cible }, select: { isBanned: true } })).isBanned).toBe(true);
    expect(await bannir(cible, false)).toBe(200);
    expect((await db().user.findUniqueOrThrow({ where: { id: cible }, select: { isBanned: true } })).isBanned).toBe(false);
    expect(await journal(cible)).toEqual([
      { adminId: 'admin', action: 'BAN', reason: 'Faux profil' },
      { adminId: 'admin', action: 'UNBAN', reason: null },
    ]);
  });
});

describe.each(CHEMINS)('invitation au selfie, par la %s', (chemin) => {
  it('pose l’invitation une fois, sans retrait, et la journalise une fois', async () => {
    const cible = await creerCompte(P, { pseudo: `${chemin}-invite` });
    const inviter = async () => {
      if (chemin === 'route') {
        const { POST } = await import('@/app/api/admin/users/[id]/invitation/route');
        return (await POST(req(`/api/admin/users/${cible}/invitation`, 'POST'), params({ id: cible }))).status;
      }
      const { inviterVerification } = await import('@/lib/moderation/gestes');
      const r = await inviterVerification(admin, cible);
      return typeof r === 'string' ? r : 200;
    };
    expect(await inviter()).toBe(200);
    const premiere = (await db().user.findUniqueOrThrow({ where: { id: cible }, select: { verifInviteeAt: true, retraitAt: true } }));
    expect(premiere.verifInviteeAt).not.toBeNull();
    expect(premiere.retraitAt).toBeNull();
    expect(await inviter()).toBe(200);
    expect((await db().user.findUniqueOrThrow({ where: { id: cible }, select: { verifInviteeAt: true } })).verifInviteeAt).toEqual(premiere.verifInviteeAt);
    expect(await journal(cible)).toEqual([{ adminId: 'admin', action: 'INVITE_VERIFICATION', reason: null }]);
  });
});

describe('suppression d’un compte, par la fonction', () => {
  it('efface le compte et journalise sur le compte de l’admin, sans le pseudo supprimé', async () => {
    const cible = await creerCompte(P, { pseudo: 'supprime', photos: [`${P}/s.jpg`] });
    const { supprimerCompte } = await import('@/lib/moderation/gestes');
    expect(await supprimerCompte(admin, cible, 'faux_profil')).toBeNull();
    expect(await db().user.count({ where: { id: cible } })).toBe(0);
    const ligne = await db().moderationLog.findFirstOrThrow({ where: { adminId: admin, action: 'DELETE_USER' }, orderBy: { createdAt: 'desc' } });
    expect(ligne.targetUserId).toBe(admin);
    expect(ligne.reason).toBe('Compte supprimé : faux profil');
    expect(ligne.reason).not.toContain('supprime@');
  });

  it('compte inconnu : rien n’est écrit', async () => {
    const { supprimerCompte } = await import('@/lib/moderation/gestes');
    const avant = await db().moderationLog.count({ where: { adminId: admin } });
    expect(await supprimerCompte(admin, '00000000-0000-4000-8000-000000000002', 'autre')).toBe('introuvable');
    expect(await db().moderationLog.count({ where: { adminId: admin } })).toBe(avant);
  });
});
