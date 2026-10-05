/**
 * Libellés admin des signaux (spec 006). Ils décrivent ce qui a été vu, pas
 * une conclusion : un indice n'est jamais une preuve.
 */
export const LIBELLES_SIGNAL: Record<string, string> = {
  contact_pseudo: 'Contact dans le pseudo',
  contact_bio: 'Contact dans la bio',
  contact_photo: 'Texte lu sur une photo',
  photo_reutilisee: 'Même photo sur un autre compte',
  photo_bannie: 'Photo d’un compte banni',
  photo_recuperee: 'Photo au format d’un réseau social',
  signalement_faux: 'Signalé comme faux profil',
  signalement_mineur: 'Signalé comme semblant avoir moins de 18 ans',
  // Spec 010.
  bloque_repetition: 'Bloqué par plusieurs membres en peu de temps',
  retour_banni: 'Même appareil ou même e-mail qu’un compte banni',
  lexique_arnaque: 'Vocabulaire d’arnaque (paiement, rencontre tarifée)',
  likes_rafale: 'Likes en rafale juste après l’inscription',
  verification_refusee: 'Selfie refusé après une invitation',
  appareil_partage: 'Appareil partagé avec un autre compte',
  inscriptions_groupees: 'Plusieurs inscriptions depuis la même connexion',
  fuseau_incoherent: 'Fuseau horaire loin de la ville indiquée',
  profil_express: 'Profil rempli et likes envoyés en quelques minutes',
};

/**
 * Indices de contexte : ils ont souvent une explication banale. Le libellé
 * le rappelle au modérateur pour qu'il ne lise pas un indice comme une preuve.
 */
export const MENTION_LEGITIME: Record<string, string> = {
  appareil_partage: 'Peut être légitime : appareil de couple ou de famille.',
  inscriptions_groupees: 'Peut être légitime : même box, même lieu public.',
  fuseau_incoherent: 'Peut être légitime : voyage ou expatriation.',
  profil_express: 'Peut être légitime : personne efficace.',
};

export const LIBELLES_NIVEAU: Record<string, string> = {
  fiable: 'Fiable',
  a_surveiller: 'À surveiller',
  douteux: 'Douteux',
};

export const LIBELLES_DECISION: Record<string, string> = {
  rien: 'Rien à signaler',
  verification: 'Vérification demandée',
  banni: 'Banni',
};
