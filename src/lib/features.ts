/**
 * Interrupteurs de fonctionnalités (#418) — partie pure, partagée client/serveur.
 *
 * Trois fonctionnalités coupables depuis l'admin, sans redéploiement. Le
 * serveur stocke la liste de ce qui est COUPÉ (`SiteConfig.featuresDisabled`) ;
 * tout ce qui n'y figure pas est actif. Le défaut est donc « rien ne change ».
 */
export const FEATURES = ['checkin', 'crossings', 'square'] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

export const TOUTES_ACTIVEES: Features = { checkin: true, crossings: true, square: true };

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
};

/** Copie membre, unique et douce — jamais « désactivé par l’admin ». */
export const COPY_EN_PAUSE = 'Cette partie de Libre est en pause pour le moment.';

export function estFeature(valeur: unknown): valeur is Feature {
  return typeof valeur === 'string' && (FEATURES as readonly string[]).includes(valeur);
}

/** Traduit la liste stockée (ce qui est coupé) en carte d'état (ce qui est actif). */
export function featuresDepuisConfig(featuresDisabled: readonly string[] | null | undefined): Features {
  const coupees = new Set(featuresDisabled ?? []);
  return {
    checkin: !coupees.has('checkin'),
    crossings: !coupees.has('crossings'),
    square: !coupees.has('square'),
  };
}

/** Sens inverse : de la carte d'état vers la liste à stocker, ordre stable. */
export function configDepuisFeatures(features: Features): Feature[] {
  return FEATURES.filter((f) => !features[f]);
}
