import { getDb } from '@/lib/db';
import { douteSerieux, signauxRecents, TYPES_CONTEXTE } from './fiabilite';
import { evaluerCompte } from './invitation';

/**
 * Signaux de faux profil (spec 006). Un signal est un indice, jamais une
 * sanction : il sert à ordonner la file « Profils à vérifier » (#444), où un
 * humain tranche. Aucune route lue par un autre membre ne les expose (garde
 * `signaux-never-leak`).
 */
export type TypeSignal =
  | 'contact_pseudo'
  | 'contact_bio'
  | 'contact_photo'
  | 'photo_reutilisee'
  | 'photo_bannie'
  | 'photo_recuperee'
  | 'signalement_faux'
  /** #437 : âge mis en doute par un membre — traité en priorité. */
  | 'signalement_mineur'
  // Spec 010 — forts.
  | 'bloque_repetition'
  | 'retour_banni'
  | 'lexique_arnaque'
  | 'likes_rafale'
  | 'verification_refusee'
  // Spec 010 — indices de contexte (faibles, voir `TYPES_CONTEXTE`).
  | 'appareil_partage'
  | 'inscriptions_groupees'
  | 'fuseau_incoherent'
  | 'profil_express';

export type ForceSignal = 'faible' | 'fort';

export interface NouveauSignal {
  userId: string;
  type: TypeSignal;
  force: ForceSignal;
  extrait?: string;
  photoKey?: string;
  autreUserId?: string;
  /** Clé de déduplication explicite (ex. l'identifiant du signalement). */
  cle?: string;
}

const EXTRAIT_MAX = 200;

/** « T . me / Lola » et « t.me/lola » sont le même contenu : un seul signal. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Clé d'unicité `(userId, cle)`. Elle empêche le même indice, reposté tel
 * quel, de remettre en file un profil déjà tranché (FR-016) — seul un
 * contenu nouveau le fait.
 */
export function cleDeSignal(type: TypeSignal, s: Pick<NouveauSignal, 'cle' | 'photoKey' | 'extrait' | 'autreUserId'>): string {
  if (s.cle) return `${type}:${s.cle}`;
  const parties = [s.photoKey, s.autreUserId, s.extrait ? normaliser(s.extrait) : undefined].filter(Boolean);
  return `${type}:${parties.join(':')}`.slice(0, 500);
}

/**
 * Best-effort : un signal perdu ne doit jamais faire échouer la requête du
 * membre (écriture de bio, envoi de photo). Journal sans PII.
 * @returns vrai si le signal est enregistré (ou existait déjà).
 */
export async function enregistrerSignal(s: NouveauSignal, options: { inviter?: boolean } = {}): Promise<boolean> {
  let enregistre = false;
  try {
    const cle = cleDeSignal(s.type, s);
    await getDb().profileSignal.upsert({
      where: { userId_cle: { userId: s.userId, cle } },
      // Rien à mettre à jour : la date du premier constat fait foi.
      update: {},
      create: {
        userId: s.userId,
        type: s.type,
        force: s.force,
        extrait: s.extrait?.slice(0, EXTRAIT_MAX) ?? null,
        photoKey: s.photoKey ?? null,
        autreUserId: s.autreUserId ?? null,
        cle,
      },
    });
    enregistre = true;
  } catch (err) {
    console.warn('fraude.signal.failed', { type: s.type, message: (err as Error)?.message?.slice(0, 80) });
    return false;
  }
  // Spec 010 : un signal peut faire basculer le compte en « douteux » et
  // déclencher l'invitation au selfie. Pas pendant un rattrapage, pour ne pas
  // inviter d'un coup tous les comptes anciens au déploiement.
  if (options.inviter !== false) await evaluerCompte(s.userId);
  return enregistre;
}

/**
 * Règle d'entrée dans la file (data-model.md) : parmi les signaux postérieurs
 * à la dernière décision, un fort, ou deux, ou un signalement « faux profil ».
 * « Photo récupérée » seule ne suffit jamais (FR-008) : beaucoup de vrais
 * membres publient une photo déjà en ligne ailleurs.
 *
 * Spec 010 : les indices de contexte (appareil partagé, fuseau…) ne comptent
 * pas dans « deux signaux » — deux explications banales feraient sinon entrer
 * un vrai membre. Ils n'agissent qu'à trois de types différents (FR-014).
 */
export function dansLaFile(
  signaux: ReadonlyArray<{ type: string; force: string; createdAt: Date }>,
  decidedAt: Date | null,
): boolean {
  const recents = signauxRecents(signaux, decidedAt);
  if (douteSerieux(recents)) return true;
  const hors = recents.filter((s) => !TYPES_CONTEXTE.has(s.type));
  if (hors.every((s) => s.type === 'photo_recuperee')) return false;
  return (
    hors.some((s) => s.type === 'signalement_faux' || s.type === 'signalement_mineur') ||
    hors.length >= 2
  );
}
