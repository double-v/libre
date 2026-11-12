/** Comptes factices de la base de test (#548). Domaine réservé `.test` : aucune adresse réelle. */
export const MEMBRES_FACTICES = [
  { email: 'admin@exemple.test', displayName: 'Admin factice', role: 'ADMIN', isBanned: false },
  { email: 'membre@exemple.test', displayName: 'Membre factice', role: 'USER', isBanned: false },
  { email: 'banni@exemple.test', displayName: 'Banni factice', role: 'USER', isBanned: true },
] as const;
