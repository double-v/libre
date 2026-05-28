const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export function isOnline(lastActive: Date): boolean {
  return Date.now() - new Date(lastActive).getTime() < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastActive: Date): string {
  const now = Date.now();
  const then = new Date(lastActive).getTime();
  const diffMs = now - then;

  if (diffMs < ONLINE_THRESHOLD_MS) return 'En ligne';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `Vu il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vu il y a ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Vu il y a ${diffD} j`;

  return new Date(lastActive).toLocaleDateString('fr-FR');
}