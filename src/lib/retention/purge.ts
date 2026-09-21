/**
 * Purge de rétention (#427) — applique les durées de `regles.ts`.
 *
 * Déclenchée par le trafic (`ensureRetentionFresh`, une fois par jour, même
 * verrou que le reset de la Place #13 : pas de cron — le plan Vercel en
 * limite le nombre et `CRON_SECRET` n'existe pas en prod) et à la demande
 * depuis l'admin (`purgerRetention`). Chaque règle est isolée : une qui
 * tombe n'empêche pas les autres, et le bilan le dit. Journaux sans PII.
 */
import { getDb } from '@/lib/db';
import { deletePhoto, isR2Configured } from '@/lib/r2';
import { seuil, type BilanRetention, type RegleId } from './regles';

const SINGLETON = 'singleton';

/** Borne de la journée UTC : deux instances qui traitent le même jour écrivent la même valeur. */
export function borneDuJour(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** `selfieUrl` est un chemin `/api/photos/<clé>`, relatif ou absolu selon l'époque. */
function cleR2DepuisSelfieUrl(selfieUrl: string): string | null {
  const marqueur = '/api/photos/';
  const i = selfieUrl.indexOf(marqueur);
  if (i === -1) return null;
  const cle = selfieUrl.slice(i + marqueur.length).split(/[?#]/)[0];
  return cle ? decodeURIComponent(cle) : null;
}

type Regle = () => Promise<number>;

function regles(now: Date): Record<RegleId, Regle> {
  const db = getDb();
  return {
    moderationLogs: async () =>
      (await db.moderationLog.deleteMany({ where: { createdAt: { lt: seuil('moderationLogs', now) } } })).count,

    passwordResetTokens: async () =>
      (await db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } })).count,

    // Le selfie est une photo du visage : la ligne part avec son objet R2 —
    // sauf si la même clé sert encore de photo de profil (cas courant).
    verificationRequests: async () => {
      const echues = await db.verificationRequest.findMany({
        where: { resolvedAt: { lt: seuil('verificationRequests', now) } },
        select: { id: true, selfieUrl: true, user: { select: { profile: { select: { photos: true } } } } },
      });
      if (echues.length === 0) return 0;
      if (isR2Configured()) {
        await Promise.all(echues.map(async ({ selfieUrl, user }) => {
          const cle = cleR2DepuisSelfieUrl(selfieUrl);
          if (!cle || user.profile?.photos.includes(cle)) return;
          try {
            await deletePhoto(cle);
          } catch (error) {
            console.error('[retention] selfie R2 non effacé', error instanceof Error ? error.message : 'erreur');
          }
        }));
      }
      return (await db.verificationRequest.deleteMany({ where: { id: { in: echues.map((e) => e.id) } } })).count;
    },

    reports: async () =>
      (await db.report.deleteMany({ where: { resolvedAt: { lt: seuil('reports', now) } } })).count,

    feedback: async () =>
      (await db.feedback.deleteMany({ where: { status: { in: ['resolved', 'spam'] }, createdAt: { lt: seuil('feedback', now) } } })).count,

    encounters: async () =>
      (await db.encounter.deleteMany({ where: { happenedAt: { lt: seuil('encounters', now) } } })).count,

    safetyCheckins: async () =>
      (await db.safetyCheckin.deleteMany({ where: { resolvedAt: { lt: seuil('safetyCheckins', now) } } })).count,

    // La preuve du consentement reste (type, version, date) ; seule la trace
    // technique s'efface.
    consentTrace: async () =>
      (await db.consent.updateMany({
        where: { createdAt: { lt: seuil('consentTrace', now) }, OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }] },
        data: { ipAddress: null, userAgent: null },
      })).count,
  };
}

/** Exécute toutes les règles ; ne jette jamais, le bilan porte les erreurs. */
export async function purgerRetention(now: Date = new Date()): Promise<BilanRetention> {
  const bilan: BilanRetention = {};
  for (const [id, executer] of Object.entries(regles(now)) as Array<[RegleId, Regle]>) {
    try {
      bilan[id] = await executer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erreur';
      console.error('[retention] règle en échec', id, message);
      bilan[id] = { erreur: message };
    }
  }
  return bilan;
}

/** Enregistre le bilan du dernier passage (page admin). */
export async function enregistrerBilan(bilan: BilanRetention, now: Date = new Date()): Promise<void> {
  await getDb().retentionState.upsert({
    where: { id: SINGLETON },
    update: { lastReport: bilan },
    create: { id: SINGLETON, lastRunAt: now, lastReport: bilan },
  });
}

/** Borne déjà traitée par cette instance : évite une requête par appel, la vérité reste en base. */
let borneConnue = 0;
export function _resetBorneConnue(): void { borneConnue = 0; }

async function reclamerJournee(borne: Date): Promise<boolean> {
  const db = getDb();
  const gagne = await db.retentionState.updateMany({
    where: { id: SINGLETON, lastRunAt: { lt: borne } },
    data: { lastRunAt: borne },
  });
  if (gagne.count > 0) return true;
  try {
    await db.retentionState.create({ data: { id: SINGLETON, lastRunAt: borne } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Purge paresseuse : le premier passage HTTP de la journée l'exécute. Sans
 * visite, rien ne bouge — c'est le rôle de l'alerte admin (48 h) de le dire.
 */
export async function ensureRetentionFresh(now: Date = new Date()): Promise<{ executee: boolean; bilan?: BilanRetention }> {
  const borne = borneDuJour(now);
  if (borneConnue >= borne.getTime()) return { executee: false };
  try {
    const aGagne = await reclamerJournee(borne);
    borneConnue = borne.getTime();
    if (!aGagne) return { executee: false };
    const bilan = await purgerRetention(now);
    await getDb().retentionState.updateMany({ where: { id: SINGLETON }, data: { lastReport: bilan } });
    return { executee: true, bilan };
  } catch (error) {
    console.error('[retention] purge paresseuse impossible', error instanceof Error ? error.message : 'erreur');
    return { executee: false };
  }
}
