/**
 * Durées relatives du back-office (spec 012) : « il y a 38 min », « vu hier ».
 * Pur, sans `Intl.RelativeTimeFormat` : les tournures du prototype sont
 * courtes (« 2 j ») et doivent rester identiques d'un navigateur à l'autre.
 */
const MIN = 60_000;
const H = 60 * MIN;
const J = 24 * H;

export function duree(iso: string, maintenant: Date = new Date()): string {
  const ms = Math.max(0, maintenant.getTime() - new Date(iso).getTime());
  if (ms < MIN) return 'moins d’une minute';
  if (ms < H) return `${Math.floor(ms / MIN)} min`;
  if (ms < J) return `${Math.floor(ms / H)} h`;
  if (ms < 30 * J) return `${Math.floor(ms / J)} j`;
  if (ms < 365 * J) return `${Math.floor(ms / (30 * J))} mois`;
  const ans = Math.floor(ms / (365 * J));
  return `${ans} an${ans > 1 ? 's' : ''}`;
}

export function ilYa(iso: string, maintenant: Date = new Date()): string {
  if (maintenant.getTime() - new Date(iso).getTime() < MIN) return 'à l’instant';
  return `il y a ${duree(iso, maintenant)}`;
}

/** `jour` au format AAAA-MM-JJ (présence au jour près, spec 011). */
export function vuLe(jour: string | null, maintenant: Date = new Date()): string {
  if (!jour) return 'jamais vu';
  const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate());
  const jours = Math.round((aujourdhui - Date.parse(`${jour}T00:00:00Z`)) / J);
  if (jours <= 0) return 'vu aujourd’hui';
  if (jours === 1) return 'vu hier';
  if (jours < 30) return `vu il y a ${jours} j`;
  return `vu il y a ${Math.floor(jours / 30)} mois`;
}
