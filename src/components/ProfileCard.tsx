import VerificationBadge from '@/components/VerificationBadge';
import OnlineIndicator from '@/components/OnlineIndicator';
import { photoUrl } from '@/lib/photos';

interface ProfileCardProps {
  id: string;
  displayName: string;
  age?: number;
  bio: string;
  isVerified: boolean;
  online?: boolean;
  distanceM?: number;
  distanceKm?: number;
  photos?: string[];
  interests?: string[];
  practices?: string[];
  onLike: () => void;
  onPass: () => void;
  onProfileClick?: (userId: string) => void;
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
  id,
  displayName,
  age,
  bio,
  isVerified,
  online,
  distanceM,
  distanceKm,
  photos,
  interests,
  practices,
  onLike,
  onPass,
  onProfileClick,
}: ProfileCardProps) {
  const distance = formatDistance(distanceM, distanceKm);

  return (
    <div role="group" aria-label={`Profil de ${displayName}`} onClick={() => onProfileClick?.(id)} className={`rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700${onProfileClick ? ' cursor-pointer' : ''}`}>
      <div className="flex items-start gap-3">
        {photos && photos.length > 0 ? (
          <div className="relative">
            <img
              src={photoUrl(photos[0])}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
            <OnlineIndicator online={online} />
          </div>
        ) : (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {displayName.charAt(0).toUpperCase()}
            <OnlineIndicator online={online} />
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
            <p className="text-sm text-gray-600 dark:text-gray-400">{distance}</p>
          )}
        </div>
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{bio}</p>
      )}

      {((interests && interests.length > 0) || (practices && practices.length > 0)) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {interests?.map((i) => (
            <span key={i} className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{i}</span>
          ))}
          {practices?.map((p) => (
            <span key={p} className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{p}</span>
          ))}
        </div>
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