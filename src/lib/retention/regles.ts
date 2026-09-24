/**
 * Durées de conservation (#427) — la source unique.
 *
 * La politique de confidentialité (§5) et la purge lisent **ce** tableau :
 * une durée promise sans purge, ou purgée sans promesse, ne peut plus exister
 * sans casser un test. Les tokens de vérification e-mail n'y figurent pas :
 * ce sont des JWT sans état, l'expiration (24 h) est dans la signature.
 *
 * Pas de règle sur les comptes (jamais vérifiés, inactifs) : c'est une
 * suppression de compte, pas une purge de trace — décision d'opérateur.
 */
export const JOUR_MS = 24 * 60 * 60 * 1000;

export interface RegleRetention {
  /** Identifiant stable, clé du bilan. */
  id: string;
  /** Libellé pour la politique et la page admin. */
  donnees: string;
  /** Durée telle qu'annoncée dans la politique. */
  duree: string;
  /** Âge au-delà duquel la ligne est purgée, en jours, à compter de `depuis`. */
  jours: number;
  /** Ce que mesure l'âge. */
  depuis: 'création' | 'résolution' | 'expiration' | 'effacement';
}

export const REGLES_RETENTION = [
  { id: 'moderationLogs', donnees: 'Logs de modération', duree: '3 ans après la dernière action', jours: 3 * 365, depuis: 'création' },
  { id: 'passwordResetTokens', donnees: 'Tokens de réinitialisation de mot de passe', duree: '1 heure ou jusqu’à utilisation', jours: 0, depuis: 'expiration' },
  { id: 'verificationRequests', donnees: 'Demandes de vérification (selfies)', duree: 'Jusqu’à résolution + 30 jours', jours: 30, depuis: 'résolution' },
  { id: 'reports', donnees: 'Signalements', duree: 'Jusqu’à résolution + 1 an', jours: 365, depuis: 'résolution' },
  // Pas de date de résolution sur les retours : l'âge court depuis la
  // création, une fois le retour clos — au plus tôt que promis, jamais plus tard.
  { id: 'feedback', donnees: 'Retours (feedback)', duree: 'Jusqu’à résolution + 1 an', jours: 365, depuis: 'création' },
  { id: 'encounters', donnees: 'Croisements (position arrondie et horodatage)', duree: '90 jours', jours: 90, depuis: 'création' },
  { id: 'safetyCheckins', donnees: 'Check-ins de sécurité (dernière position)', duree: 'Jusqu’à résolution + 30 jours', jours: 30, depuis: 'résolution' },
  // Le geste « effacer » masque le message tout de suite ; le chiffré reste
  // 30 jours pour qu'un message regretté puis effacé puisse encore être
  // signalé — l'escrow le rend lisible par le service, d'où une fenêtre courte
  // (décision opérateur du 2026-09-24, #202). La pierre tombale, elle, reste.
  { id: 'messagesEffaces', donnees: 'Messages effacés par leur auteur (contenu chiffré)', duree: '30 jours après l’effacement', jours: 30, depuis: 'effacement' },
  { id: 'consentTrace', donnees: 'Trace technique du consentement (adresse IP, navigateur)', duree: '3 ans — le consentement lui-même est conservé', jours: 3 * 365, depuis: 'création' },
] as const satisfies readonly RegleRetention[];

export type RegleId = (typeof REGLES_RETENTION)[number]['id'];

export function regle(id: RegleId): RegleRetention {
  return REGLES_RETENTION.find((r) => r.id === id)!;
}

/** Instant avant lequel une ligne de cette règle est à purger. */
export function seuil(id: RegleId, now: Date): Date {
  return new Date(now.getTime() - regle(id).jours * JOUR_MS);
}

/** Bilan d'un passage : nombre de lignes touchées par règle, ou l'erreur. */
export type BilanRetention = Partial<Record<RegleId, number | { erreur: string }>>;
