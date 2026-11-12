/**
 * Repères de décision et « Le membre verra » (spec 012, US4, FR-020 à FR-022).
 *
 * Source unique : la fiche membre les affiche, et le Guide de modération les
 * reprendra (lot 4). Chaque « Le membre verra » décrit **ce que l'app montre
 * réellement** aujourd'hui, copie comprise ; quand un geste ne montre encore
 * rien (l'avertissement, avant la spec 012 US6), le texte le dit. Module pur,
 * importé côté client.
 */
import type { TypeCas } from './cas';

/** Motifs de signalement, tels que la modération les lit (#369). */
export const MOTIFS_SIGNALEMENT: Record<string, string> = {
  harassment: 'Harcèlement ou intimidation',
  inappropriate: 'Contenu inapproprié',
  fake: 'Faux profil',
  minor: 'Semble avoir moins de 18 ans',
  scam: 'Arnaque ou demande d’argent',
  // Avant #369 (octobre 2026), « spam » couvrait aussi les arnaques.
  spam: 'Spam ou publicité (ou arnaque, signalements anciens)',
  other: 'Autre',
};

/**
 * Motifs fermés d'un bannissement ou d'une suppression (FR-022). Le libellé
 * est ce que l'historique affiche ; aucun texte libre de modérateur.
 */
export const MOTIFS_SANCTION = {
  argent: 'Demande d’argent',
  menaces: 'Menaces ou harcèlement',
  faux_profil: 'Faux profil',
  mineur: 'Mineur·e',
  autre: 'Autre',
} as const;
export type MotifSanction = keyof typeof MOTIFS_SANCTION;
export const CODES_MOTIFS_SANCTION = Object.keys(MOTIFS_SANCTION) as [MotifSanction, ...MotifSanction[]];

export const REPERES: Record<TypeCas, string> = {
  verif: 'Valide seulement si tu réponds oui aux trois questions. Au moindre doute, refuse : le membre reçoit un nouveau code et peut réessayer tout de suite.',
  report: 'Un premier écart sans menace : avertir. Une menace ou une demande d’argent : bannir. Juge le contenu signalé, pas le nombre de signalements.',
  photo: 'Un pseudo de réseau social ou un numéro sur une photo contourne la règle de la bio : retire la photo.',
  reponse: 'Un moyen de contact, même écrit en toutes lettres, n’a pas sa place dans une réponse.',
  indice: 'Un indice ne suffit jamais pour sanctionner. Le selfie lève le doute sans rien retirer au membre.',
  relecture: 'Relis le profil corrigé : s’il respecte les règles, rends-le visible.',
};

const REPERE_ARGENT = 'Une demande d’argent à quelqu’un rencontré sur Libre suffit pour bannir, même au premier signalement.';
const REPERE_DOUBLON = 'Garde le compte dont l’e-mail est confirmé. La suppression est inscrite dans l’historique du compte gardé.';

/** Le repère d'un cas précis : la demande d'argent et le doublon ont le leur. */
export function repereDuCas(c: { type: 'report'; motif: string } | { type: 'indice'; doublon: boolean } | { type: TypeCas }): string {
  if (c.type === 'report' && 'motif' in c && c.motif === 'scam') return REPERE_ARGENT;
  if (c.type === 'indice' && 'doublon' in c && c.doublon) return REPERE_DOUBLON;
  return REPERES[c.type];
}

export type CodeGeste =
  | 'valider' | 'refuser'
  | 'sans_suite' | 'avertir' | 'bannir'
  | 'garder' | 'voiler' | 'lever_voile' | 'retirer_photo'
  | 'retirer_reponse'
  | 'rien' | 'inviter' | 'supprimer_doublon'
  | 'mettre_en_retrait' | 'rendre_visible' | 'debannir' | 'supprimer';

export interface Geste {
  libelle: string;
  /** Une feuille de confirmation s'ouvre avant d'agir. */
  confirme: boolean;
  /** Ce que l'app montre au membre, en une ou deux phrases (FR-021). */
  membreVerra: string;
  /** Motifs de la liste fermée, quand le geste en exige un. */
  motifs?: readonly string[];
}

export const GESTES: Record<CodeGeste, Geste> = {
  valider: {
    libelle: 'Tout est bon, valider',
    confirme: false,
    membreVerra: 'Son profil porte le badge vérifié. S’il a activé les notifications, il apprend qu’il a une réponse.',
  },
  refuser: {
    libelle: 'Refuser…',
    confirme: true,
    membreVerra: 'Le motif, un conseil et un nouveau code pour refaire son selfie tout de suite.',
  },
  sans_suite: {
    libelle: 'Sans suite',
    confirme: false,
    membreVerra: 'Rien : le signalement est classé sans suite.',
  },
  avertir: {
    libelle: 'Avertir',
    confirme: true,
    membreVerra: 'Rien pour l’instant : le message d’avertissement arrive avec une prochaine version. Le signalement est clos et l’avertissement inscrit à l’historique.',
  },
  bannir: {
    libelle: 'Bannir…',
    confirme: true,
    membreVerra: 'À sa prochaine connexion : « Votre compte a été suspendu. Contactez le support si vous pensez qu’il s’agit d’une erreur. » C’est la seule décision sans suite dans l’app.',
    motifs: CODES_MOTIFS_SANCTION,
  },
  garder: {
    libelle: 'Garder',
    confirme: false,
    membreVerra: 'Rien : sa photo reste en place, ses indices sont archivés et une mise en retrait éventuelle est levée.',
  },
  voiler: {
    libelle: 'Voiler…',
    confirme: true,
    membreVerra: 'Rien sur son profil : sa photo reste en place, floutée pour les personnes qui n’ont pas choisi de voir ce type de photo.',
  },
  lever_voile: {
    libelle: 'Lever le voile…',
    confirme: true,
    membreVerra: 'Rien : sa photo redevient nette pour tout le monde.',
  },
  retirer_photo: {
    libelle: 'Retirer…',
    confirme: true,
    membreVerra: 'Sa photo disparaît de son profil. Il peut en ajouter une autre.',
  },
  retirer_reponse: {
    libelle: 'Retirer la réponse',
    confirme: true,
    membreVerra: '« Cette réponse a été retirée par la modération. Tu peux en écrire une autre. »',
  },
  rien: {
    libelle: 'Rien à signaler',
    confirme: false,
    membreVerra: 'Rien : ses indices sont archivés et une mise en retrait éventuelle est levée.',
  },
  inviter: {
    libelle: 'Inviter au selfie',
    confirme: false,
    membreVerra: 'Une invitation à faire vérifier son profil par un selfie, quand il le veut. Rien ne lui est retiré.',
  },
  supprimer_doublon: {
    libelle: 'Supprimer le doublon…',
    confirme: true,
    membreVerra: 'Rien : seul le compte jamais confirmé disparaît, ce membre garde le sien.',
  },
  mettre_en_retrait: {
    libelle: 'Mettre en retrait…',
    confirme: true,
    membreVerra: 'Un bandeau : « Ton profil est masqué le temps d’une vérification. » Il ne peut plus liker ni écrire, et son profil réapparaît dès que son selfie est validé.',
  },
  rendre_visible: {
    libelle: 'Rendre visible',
    confirme: false,
    membreVerra: 'Le bandeau disparaît : son profil est de nouveau visible, et il peut liker et écrire.',
  },
  debannir: {
    libelle: 'Débannir',
    confirme: false,
    membreVerra: 'Il peut de nouveau se connecter et retrouve son compte tel qu’il était.',
  },
  supprimer: {
    libelle: 'Supprimer le compte…',
    confirme: true,
    membreVerra: 'Son compte, ses photos et ses messages disparaissent. C’est irréversible.',
    motifs: CODES_MOTIFS_SANCTION,
  },
};

/**
 * Libellés de l'historique d'une fiche (FR-024). Une action sans libellé
 * s'affiche par sa clé plutôt que de disparaître.
 */
export const LIBELLES_ACTION: Record<string, string> = {
  INSCRIPTION: 'Inscription',
  BAN: 'Banni',
  UNBAN: 'Débanni',
  WARNING: 'Avertissement',
  DELETE_USER: 'Compte supprimé',
  DELETE_DUPLICATE: 'Doublon supprimé',
  APPROVE_VERIFICATION: 'Selfie validé',
  REJECT_VERIFICATION: 'Selfie refusé',
  DISMISS_REPORT: 'Signalement classé sans suite',
  REMOVE_ANSWER: 'Réponse retirée',
  REMOVE_PHOTO: 'Photo retirée',
  CLASSIFY_PHOTO: 'Photo voilée',
  DECLASSIFY_PHOTO: 'Voile levé',
  INVITE_VERIFICATION: 'Invitation à la vérification',
  PROFILE_REVIEW_RIEN: 'Indices archivés : rien à signaler',
  PROFILE_REVIEW_VERIFICATION: 'Mis en retrait jusqu’au selfie',
  PROFILE_REVIEW_BANNI: 'Banni après examen des indices',
  SQUARE_BAN: 'Exclu de La Place',
};

/**
 * Consultations journalisées (photo privée, clé de messagerie, recherche de
 * photo) : elles restent au journal complet, mais la fiche ne raconte que
 * les décisions — sinon chaque ouverture de fiche y ajouterait des lignes.
 */
export const ACTIONS_CONSULTATION: ReadonlySet<string> = new Set(['VIEW_PRIVATE_PHOTO', 'VIEW_KEY_STATE', 'SEARCH_PHOTO', 'STRIP_PHOTO_METADATA']);

/** Motifs fermés d'un retrait ou d'un voile de photo, inscrits au journal. */
export const MOTIFS_PHOTO = [
  'Moyen de contact visible sur la photo',
  'Nudité ou image choquante',
  'Ce n’est pas une photo de la personne',
  'Autre manquement aux règles',
] as const;

/** Motifs fermés pour lever un voile. */
export const MOTIFS_LEVER_VOILE = ['Voile posé par erreur', 'Photo conforme après relecture'] as const;
