import { getDb } from '@/lib/db';

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
  | 'signalement_mineur';

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
export async function enregistrerSignal(s: NouveauSignal): Promise<boolean> {
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
    return true;
  } catch (err) {
    console.warn('fraude.signal.failed', { type: s.type, message: (err as Error)?.message?.slice(0, 80) });
    return false;
  }
}

/**
 * Règle d'entrée dans la file (data-model.md) : parmi les signaux postérieurs
 * à la dernière décision, un fort, ou deux, ou un signalement « faux profil ».
 * « Photo récupérée » seule ne suffit jamais (FR-008) : beaucoup de vrais
 * membres publient une photo déjà en ligne ailleurs.
 */
export function dansLaFile(
  signaux: ReadonlyArray<{ type: string; force: string; createdAt: Date }>,
  decidedAt: Date | null,
): boolean {
  const recents = signaux.filter((s) => !decidedAt || s.createdAt > decidedAt);
  if (recents.every((s) => s.type === 'photo_recuperee')) return false;
  return (
    recents.some((s) => s.force === 'fort') ||
    recents.some((s) => s.type === 'signalement_faux' || s.type === 'signalement_mineur') ||
    recents.length >= 2
  );
}
