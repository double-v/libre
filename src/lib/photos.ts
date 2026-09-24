export function photoUrl(key: string | null | undefined): string {
  if (!key) return '';
  // If it's already an http URL (legacy data), return as-is
  if (key.startsWith('http')) return key;
  // Otherwise it's an R2 key — proxy through our signed-URL API
  return `/api/photos/${encodeURIComponent(key)}`;
}
const PREFIXE_PROXY = '/api/photos/';

/**
 * Inverse de `photoUrl` (#442) : la clé R2 derrière une URL du proxy, pour les
 * surfaces qui ne reçoivent que l'URL (file de vérification). `null` pour une
 * URL héritée hors R2 ou mal encodée — il n'y a alors rien à rechercher.
 */
export function cleDepuisUrl(url: string): string | null {
  if (!url.startsWith(PREFIXE_PROXY)) return null;
  try {
    return decodeURIComponent(url.slice(PREFIXE_PROXY.length)) || null;
  } catch {
    return null;
  }
}
