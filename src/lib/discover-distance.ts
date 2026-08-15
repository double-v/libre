/**
 * Distance dans le feed de découverte (#327).
 *
 * Deux besoins distincts vivent ici :
 *
 * 1. **Filtrer** par distance sans charger toute la table. `boundingBox` donne
 *    un rectangle lat/lng qu'on pousse dans le `where` Prisma : la base ne
 *    renvoie que les profils plausibles, la haversine exacte affine ensuite en
 *    mémoire. Un rectangle déborde du cercle (jusqu'à √2·r dans les coins),
 *    d'où l'affinage — jamais l'inverse : la bbox seule laisserait passer
 *    quelqu'un à 70 km sur un filtre à 50.
 *
 * 2. **Afficher** une distance sans donner de quoi trianguler. Le segment
 *    « À proximité » assume le kilomètre (l'utilisateur a explicitement demandé
 *    de la géo), le feed « Pour toi » ne sort que des tranches larges — et
 *    l'API n'envoie que la tranche, pas le km : une valeur précise dans le JSON
 *    resterait lisible dans l'onglet réseau, ce qui viderait la garde de son
 *    sens.
 */

const EARTH_RADIUS_KM = 6371;

export interface BoundingBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * Rectangle englobant le disque de rayon `km` autour d'un point.
 *
 * Aux pôles et de part et d'autre de l'antiméridien, un rectangle simple
 * (`gte`/`lte`) ne peut pas décrire la zone : on élargit alors la longitude à
 * tout le tour du globe et on laisse la haversine trancher. Élargir est sûr,
 * rétrécir ferait disparaître des profils.
 */
export function boundingBox(lat: number, lng: number, km: number): BoundingBox {
  const deltaLat = ((km / EARTH_RADIUS_KM) * 180) / Math.PI;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  const latMin = Math.max(-90, lat - deltaLat);
  const latMax = Math.min(90, lat + deltaLat);

  // Près des pôles le parallèle se resserre : le delta de longitude explose
  // (division par un cosinus ~0) et finit par couvrir le globe entier.
  if (Math.abs(cosLat) < 1e-9) {
    return { latMin, latMax, lngMin: -180, lngMax: 180 };
  }

  const deltaLng = ((km / (EARTH_RADIUS_KM * Math.abs(cosLat))) * 180) / Math.PI;
  if (deltaLng >= 180 || lng - deltaLng < -180 || lng + deltaLng > 180) {
    return { latMin, latMax, lngMin: -180, lngMax: 180 };
  }

  return { latMin, latMax, lngMin: lng - deltaLng, lngMax: lng + deltaLng };
}

/**
 * Tranches de distance affichées hors segment « À proximité ». Clés stables
 * côté API (le libellé, lui, peut bouger sans casser un client).
 */
export const DISTANCE_BUCKETS = ['lt1', '1-3', '3-5', '5-10', '10-20', '20-50', 'gt50'] as const;

export type DistanceBucket = (typeof DISTANCE_BUCKETS)[number];

export const DISTANCE_BUCKET_LABELS: Record<DistanceBucket, string> = {
  lt1: "moins d'1 km",
  '1-3': '1–3 km',
  '3-5': '3–5 km',
  '5-10': '5–10 km',
  '10-20': '10–20 km',
  '20-50': '20–50 km',
  gt50: 'plus de 50 km',
};

/** Borne haute exclusive de chaque tranche, en km. */
const BUCKET_EDGES: Array<[number, DistanceBucket]> = [
  [1, 'lt1'],
  [3, '1-3'],
  [5, '3-5'],
  [10, '5-10'],
  [20, '10-20'],
  [50, '20-50'],
];

export function distanceBucket(km: number): DistanceBucket {
  for (const [edge, bucket] of BUCKET_EDGES) {
    if (km < edge) return bucket;
  }
  return 'gt50';
}

export function distanceBucketLabel(bucket: string | undefined): string | null {
  if (!bucket) return null;
  return DISTANCE_BUCKET_LABELS[bucket as DistanceBucket] ?? null;
}
