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
};

export const LIBELLES_DECISION: Record<string, string> = {
  rien: 'Rien à signaler',
  verification: 'Vérification demandée',
  banni: 'Banni',
};
