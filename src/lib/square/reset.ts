import { getDb } from '@/lib/db';
import { getTodayThemeConfig } from './themes-server';
import { addSystemMessage, broadcastReset } from './store';
import { lastResetBoundary } from './reset-clock';

const SINGLETON = 'singleton';

export interface ResetOutcome {
  reset: boolean;
  deletedMessages: number;
  deletedReactions: number;
}

/**
 * Purge effective de La Place : messages, réactions, signalements traités,
 * puis message d'accueil du thème du jour et diffusion aux clients SSE.
 *
 * Extrait de la route cron pour que les deux chemins — cron et trafic — fassent
 * exactement la même chose. Deux purges divergentes, c'est deux comportements
 * à déboguer.
 */
export async function resetSquare(): Promise<ResetOutcome> {
  const db = getDb();

  const deletedReactions = await db.squareReaction.deleteMany({});
  const deletedMessages = await db.squareMessage.deleteMany({});

  // Les signalements encore en attente survivent : la modération n'a pas à
  // perdre sa file parce que la Place a tourné.
  await db.squareMessageReport.deleteMany({ where: { status: { not: 'pending' } } });

  const theme = await getTodayThemeConfig();
  await addSystemMessage(
    `🗳️ Bienvenue sur La Place ! Aujourd'hui : ${theme.label}. ${theme.description}`,
  );

  broadcastReset();

  return {
    reset: true,
    deletedMessages: deletedMessages.count,
    deletedReactions: deletedReactions.count,
  };
}

const PAS_DE_RESET: ResetOutcome = { reset: false, deletedMessages: 0, deletedReactions: 0 };

/**
 * Borne déjà connue comme traitée **par cette instance**. Économise un SELECT
 * sur chaque lecture de la Place ; ne sert qu'à ça, la vérité reste en base
 * (une instance neuve repart simplement avec 0).
 */
let borneConnue = 0;

/**
 * Réclame le droit d'exécuter le reset de cette journée. Un seul appelant peut
 * gagner : c'est l'`UPDATE … WHERE last_reset_at < borne` qui arbitre, en une
 * requête, sans verrou applicatif.
 */
async function reclamerReset(borne: Date): Promise<boolean> {
  const db = getDb();

  const gagne = await db.squareState.updateMany({
    where: { id: SINGLETON, lastResetAt: { lt: borne } },
    data: { lastResetAt: borne },
  });
  if (gagne.count > 0) return true;

  // Zéro ligne mise à jour = soit la journée est déjà traitée, soit le témoin
  // n'existe pas encore (première exécution). Le `create` tranche : il échoue
  // sur la clé primaire si quelqu'un vient de le poser.
  try {
    await db.squareState.create({ data: { id: SINGLETON, lastResetAt: borne } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset paresseux (#13) — le premier passage HTTP après l'heure de reset
 * l'exécute.
 *
 * Le cron Vercel ne l'a jamais fait : aucun `CRON_SECRET` n'est défini en prod,
 * donc `/api/square/reset` répondait 401 à chaque passage, en silence. Le plan
 * est par ailleurs limité en nombre de crons — plutôt que d'en dépendre, on
 * s'adosse au trafic, qui est exactement le moment où le reset se voit.
 *
 * Conséquence assumée : sans visite, La Place reste figée sur la veille. Ce
 * n'est pas grave — personne ne la regarde à ce moment-là, et la première
 * lecture la trouve propre.
 *
 * Ne jette jamais : un reset raté ne doit pas transformer une lecture de la
 * Place en 500 (cf. la leçon du trigger Pusher non wrappé).
 */
export async function ensureSquareFresh(now: Date = new Date()): Promise<ResetOutcome> {
  const borne = lastResetBoundary(now);
  if (borneConnue >= borne.getTime()) return PAS_DE_RESET;

  try {
    const aGagne = await reclamerReset(borne);
    borneConnue = borne.getTime();
    if (!aGagne) return PAS_DE_RESET;
    return await resetSquare();
  } catch (error) {
    // La borne n'est pas mémorisée ici : on retentera au prochain passage.
    console.error('[square] reset paresseux impossible', error);
    return PAS_DE_RESET;
  }
}

/** Réservé aux tests : oublie ce que cette instance croit savoir. */
export function _oublierBorneConnue(): void {
  borneConnue = 0;
}
