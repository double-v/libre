export function photoUrl(key: string | null | undefined): string {
  if (!key) return '';
  // If it's already an http URL (legacy data), return as-is
  if (key.startsWith('http')) return key;
  // Otherwise it's an R2 key — proxy through our signed-URL API
  return `/api/photos/${encodeURIComponent(key)}`;
}