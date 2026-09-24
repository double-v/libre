/**
 * Interrupteurs de fonctionnalités (#418) — partie pure, partagée client/serveur.
 *
 * Fonctionnalités pilotables depuis l'admin, sans redéploiement. Chacune a un
 * **défaut** (`DEFAUTS`) ; le serveur ne stocke que les écarts à ce défaut :
 * `SiteConfig.featuresDisabled` pour celles actives par défaut qu'on a coupées,
 * `SiteConfig.featuresEnabled` pour celles coupées par défaut qu'on a allumées
 * (spec 007, R4). Listes vides = chaque fonctionnalité à son défaut : une
 * fonctionnalité future s'ajoute sans migration de données, dans un sens comme
 * dans l'autre.
 */
export const FEATURES = ['checkin', 'crossings', 'square', 'journal_comments'] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

/**
 * État sans aucun geste admin — et état de repli sur panne de lecture : une
 * erreur ne coupe rien de ce qui tourne, et n'allume rien de ce qui attend.
 */
export const DEFAUTS: Features = { checkin: true, crossings: true, square: true, journal_comments: false };

/** Ce que l'admin lit sur chaque interrupteur — libellé et ce que « coupé » produit. */
export const COPY_FEATURES: Record<Feature, { libelle: string; effet: string }> = {
  checkin: {
    libelle: 'Check-in de sécurité',
    effet: 'Coupé : l’action disparaît du menu des fils, aucun nouveau check-in ne peut démarrer. Ceux en cours vont à leur terme.',
  },
  crossings: {
    libelle: 'Croisements',
    effet: 'Coupé : l’onglet disparaît de Découvrir, la page et l’API répondent « en pause ». La position continue d’être enregistrée.',
  },
  square: {
    libelle: 'La Place',
    effet: 'Coupé : l’onglet disparaît de la barre du bas, la page et l’API répondent « en pause », les crons ne font rien.',
  },
  journal_comments: {
    libelle: 'Commentaires du journal',
    effet: 'Coupé par défaut. À venir : allumé, les inscrits pourront commenter les nouvelles où les commentaires sont ouverts, après validation par l’équipe. Aujourd’hui, sans effet visible.',
  },
};

/** Copie membre, unique et douce — jamais « désactivé par l’admin ». */
export const COPY_EN_PAUSE = 'Cette partie de Libre est en pause pour le moment.';

export function estFeature(valeur: unknown): valeur is Feature {
  return typeof valeur === 'string' && (FEATURES as readonly string[]).includes(valeur);
}

/** Traduit les deux listes stockées (les écarts aux défauts) en carte d'état. */
export function featuresDepuisConfig(
  featuresDisabled: readonly string[] | null | undefined,
  featuresEnabled: readonly string[] | null | undefined,
): Features {
  const coupees = new Set(featuresDisabled ?? []);
  const allumees = new Set(featuresEnabled ?? []);
  return Object.fromEntries(
    FEATURES.map((f) => [f, DEFAUTS[f] ? !coupees.has(f) : allumees.has(f)]),
  ) as Features;
}

/** Sens inverse : de la carte d'état vers les deux listes à stocker, ordre stable. */
export function configDepuisFeatures(features: Features): { featuresDisabled: Feature[]; featuresEnabled: Feature[] } {
  return {
    featuresDisabled: FEATURES.filter((f) => DEFAUTS[f] && !features[f]),
    featuresEnabled: FEATURES.filter((f) => !DEFAUTS[f] && features[f]),
  };
}
