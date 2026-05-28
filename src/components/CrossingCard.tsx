import VerificationBadge from '@/components/VerificationBadge';

interface CrossingCardProps {
  id: string;
  displayName: string;
  age?: number;
  isVerified: boolean;
  distanceM: number;
  happenedAt: string;
  bio?: string;
  onLike: () => void;
  onPass: () => void;
  onProfileClick?: (userId: string) => void;
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "a l'instant";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "a l'instant";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;

  const months = Math.floor(days / 30);
  return `il y a ${months}mois`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export default function CrossingCard({
  id,
  displayName,
  age,
  isVerified,
  distanceM,
  happenedAt,
  bio,
  onLike,
  onPass,
  onProfileClick,
}: CrossingCardProps) {
  const timeAgo = getTimeAgo(happenedAt);

  return (
    <div role="group" aria-label={`Croisement avec ${displayName}`} onClick={() => onProfileClick?.(id)} className={`rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700${onProfileClick ? ' cursor-pointer' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {displayName}{age != null ? `, ${age}` : ''}
            </h3>
            <VerificationBadge isVerified={isVerified} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{timeAgo}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{formatDistance(distanceM)}</span>
          </div>
        </div>
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{bio}</p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onPass}
          aria-label={`Passer ${displayName}`}
          className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Passer
        </button>
        <button
          type="button"
          onClick={onLike}
          aria-label={`Like ${displayName}`}
          className="flex-1 rounded-full bg-terracotta py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Like
        </button>
      </div>
    </div>
  );
}