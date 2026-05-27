import VerificationBadge from '@/components/VerificationBadge';

interface ProfileCardProps {
  id: string;
  displayName: string;
  age?: number;
  bio: string;
  isVerified: boolean;
  distanceM?: number;
  distanceKm?: number;
  photos?: string[];
  onLike: () => void;
  onPass: () => void;
}

function formatDistance(meters?: number, kilometers?: number): string | null {
  if (kilometers != null) {
    return kilometers < 1 ? `${Math.round(kilometers * 1000)} m` : `${kilometers.toFixed(1)} km`;
  }
  if (meters != null) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  }
  return null;
}

export default function ProfileCard({
  displayName,
  age,
  bio,
  isVerified,
  distanceM,
  distanceKm,
  photos,
  onLike,
  onPass,
}: ProfileCardProps) {
  const distance = formatDistance(distanceM, distanceKm);

  return (
    <div className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700">
      <div className="flex items-start gap-3">
        {photos && photos.length > 0 ? (
          <img
            src={photos[0]}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {displayName}{age != null ? `, ${age}` : ''}
            </h3>
            <VerificationBadge isVerified={isVerified} />
          </div>
          {distance && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{distance}</p>
          )}
        </div>
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{bio}</p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onPass}
          className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Passer
        </button>
        <button
          type="button"
          onClick={onLike}
          className="flex-1 rounded-full bg-black py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Like
        </button>
      </div>
    </div>
  );
}