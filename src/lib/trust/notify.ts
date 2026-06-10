/**
 * V1 stub du service de notification.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.7.
 *
 * En V1, on LOG tout et on retourne 'sent'. En V2, on branchera
 * - Resend pour les emails
 * - Twilio pour les SMS
 * Le contrat est fixe, l'implémentation change.
 *
 * Pourquoi un stub plutôt qu'un vrai client maintenant :
 * - Coût (Resend a un free tier mais on veut pas hardcode la clé)
 * - Design d'email : il faut le faire valider (pas dans le scope V1)
 * - Opt-in / opt-out : spec V2, pas de contacts hors-app en V1
 *   (cf. décision #43)
 *
 * Usage futur (V2) : le cron #52 crée des CheckinAlert avec
 * deliveryStatus='queued'. Un dispatcher les consommera et appellera
 * `notifyContactExpired` pour chacun. Le stub V1 fait déjà le
 * logging structuré (JSON) pour qu'on puisse valider le flow
 * end-to-end sans provider.
 */

export interface NotifyContactParams {
  contact: {
    id: string;
    pseudonym: string;
    // email? phone? — V2. Le User a `email` mais on ne veut pas
    // l'exposer au contact tiers (il est dans le cercle en tant
    // qu'ID, pas forcément en tant qu'email). V2 ajoutera
    // `contactEmail?: string` ou `contactPhone?: string` selon
    // le canal d'invitation choisi.
  };
  owner: {
    id: string;
    pseudonym: string;
  };
  checkin: {
    id: string;
    triggeredAt: Date;
    expiresAt: Date;
    lastLat?: number;
    lastLng?: number;
  };
}

export interface NotifyContactResult {
  status: 'sent' | 'failed';
  reason?: string;
}

/**
 * V1 stub : log structuré, retourne 'sent' toujours.
 *
 * Le format JSON est stable pour que les outils de log (Vercel
 * Runtime Logs, Datadog, etc.) puissent parser les champs.
 */
export async function notifyContactExpired(
  params: NotifyContactParams,
): Promise<NotifyContactResult> {
  // Log structuré — lisible par tail/grep ET parsable par outils
  const payload = {
    level: 'info',
    event: 'checkin.notify.stub',
    contact: {
      id: params.contact.id,
      pseudonym: params.contact.pseudonym,
    },
    owner: {
      id: params.owner.id,
      pseudonym: params.owner.pseudonym,
    },
    checkin: {
      id: params.checkin.id,
      triggeredAt: params.checkin.triggeredAt.toISOString(),
      expiresAt: params.checkin.expiresAt.toISOString(),
      // Position : null en V1 (cf. POST /api/circle/check-in)
      lastLat: params.checkin.lastLat ?? null,
      lastLng: params.checkin.lastLng ?? null,
    },
    // TODO V2 : dispatcher via Resend / Twilio
    // - Si Resend : POST https://api.resend.com/emails
    // - Si Twilio : client.messages.create({ to, from, body })
    // - Opt-in check : vérifier que le contact a confirmé son canal
    // - Locale : template FR par défaut, EN si contact.lang === 'en'
    deliveryChannel: 'stub',
  };

  console.log(JSON.stringify(payload));

  return { status: 'sent' };
}
