/**
 * Copie du démarrage (#346) : dire que le site est jeune plutôt que laisser un
 * vide inexpliqué. Un nouvel inscrit qui voit dix cartes sans un mot conclut
 * que le service est mort ; s'il lit qu'il vient d'ouvrir, il revient.
 *
 * Source unique pour Découvrir et la bannière du shell. Même charte que la
 * relance (`NUDGE_COPY`) : aucun chiffre — un compteur d'inscrits qui stagne
 * est pire que pas de compteur —, des phrases complètes, ni excuse ni faux
 * enthousiasme. Le propos exact est validé par l'opérateur.
 */
export const LAUNCH_COPY = {
  titre: 'Libre vient d’ouvrir',
  /** Fin de feed, profil encore incomplet : le geste utile tout de suite. */
  finDeFeed:
    'Tu as fait le tour des personnes inscrites. D’autres arrivent peu à peu. En attendant, une photo et quelques lignes sur toi font toute la différence quand quelqu’un de nouveau te découvre.',
  /** Fin de feed, profil complet : rien à demander, seulement la vérité. */
  finDeFeedComplet:
    'Tu as fait le tour des personnes inscrites. D’autres arrivent peu à peu : reviens dans quelques jours pour découvrir les nouveaux profils.',
  /** Feed vide sans filtre. */
  vide: 'Personne ne s’affiche pour le moment. Les inscriptions arrivent peu à peu : reviens dans quelques jours.',
  /** Feed vide avec des filtres actifs : le levier est chez la personne. */
  videFiltres:
    'Personne ne correspond à tes critères pour le moment. Les inscriptions arrivent peu à peu : élargis tes filtres pour voir plus de monde.',
  /** Feed vide dans un rayon choisi. */
  videRayon: (km: number) =>
    `Personne dans un rayon de ${km} km pour le moment. Les inscriptions arrivent peu à peu : élargis la distance pour voir plus de monde.`,
  ctaProfil: 'Compléter mon profil',
  ctaJournal: 'Lire où en est Libre',
  /** Bannière du shell connecté : remplace « version bêta ». */
  banniere: 'Libre vient d’ouvrir. Les inscriptions arrivent peu à peu, et tes retours nous aident à avancer.',
} as const;

export const LAUNCH_PROFILE_HREF = '/profile';
export const LAUNCH_JOURNAL_HREF = '/journal';
