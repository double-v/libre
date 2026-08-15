import VerificationBadge from '@/components/VerificationBadge';
import OnlineIndicator from '@/components/OnlineIndicator';
import SensitivePhoto from '@/components/ui/SensitivePhoto';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Card from '@/components/ui/Card';
import { distanceBucketLabel } from '@/lib/discover-distance';
interface ProfileCardProps {
  id: string;
  displayName: string;
  age?: number;
  bio: string;
  isVerified: boolean;
  online?: boolean;
  distanceM?: number;
  distanceKm?: number;
  /** Tranche large (« 3–5 km ») servie hors segment « À proximité » : c'est
   *  tout ce que l'API laisse sortir là où la précision n'apporte rien (#327). */
  distanceBucket?: string;
  photos?: string[];
  /** Clés servies floutées à ce lecteur (#330), calculées côté serveur. */
  veiledPhotos?: string[];
  interests?: string[];
  practices?: string[];
  onLike: () => void;
  onPass: () => void;
  onProfileClick?: (userId: string) => void;
}

function formatDistance(
  meters?: number,
  kilometers?: number,
  bucket?: string,
): string | null {
  const bucketLabel = distanceBucketLabel(bucket);
  if (bucketLabel) return bucketLabel;
  if (kilometers != null) {
    if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`;
    // Le serveur arrondit déjà au km sur ce segment : « 4.0 km » afficherait
    // une décimale qui ne veut rien dire.
    return Number.isInteger(kilometers) ? `${kilometers} km` : `${kilometers.toFixed(1)} km`;
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
  distanceBucket,
  photos,
  veiledPhotos,
  interests,
  practices,
  onLike,
  onPass,
  onProfileClick,
}: ProfileCardProps) {
  const distance = formatDistance(distanceM, distanceKm, distanceBucket);

  return (
    <Card
      as="article"
      interactive={!!onProfileClick}
      role="group"
      aria-label={`Profil de ${displayName}`}
      onClick={() => onProfileClick?.(id)}
    >
      <div className="flex items-start gap-3">
        {photos && photos.length > 0 ? (
          <div className="relative">
            <SensitivePhoto
              photoKey={photos[0]}
              alt={displayName}
              size="avatar"
              veiled={veiledPhotos?.includes(photos[0])}
            />
            <OnlineIndicator online={online} />
          </div>
        ) : (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-fill-subtle text-lg font-medium text-muted">
            {displayName.charAt(0).toUpperCase()}
            <OnlineIndicator online={online} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-content">
              {displayName}{age != null ? `, ${age}` : ''}
            </h3>
            <VerificationBadge isVerified={isVerified} />
          </div>
          {distance && (
            <p className="text-sm text-muted">{distance}</p>
          )}
        </div>
      </div>

      {bio && (
        <p className="mt-3 line-clamp-2 text-sm text-muted">{bio}</p>
      )}

      {((interests && interests.length > 0) || (practices && practices.length > 0)) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {interests?.map((i) => (
            <Tag key={i}>{i}</Tag>
          ))}
          {practices?.map((p) => (
            <Tag key={p} variant="accent">{p}</Tag>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onPass}
          aria-label={`Passer ${displayName}`}
        >
          Passer
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onLike}
          aria-label={`Like ${displayName}`}
        >
          Like
        </Button>
      </div>
    </Card>
  );
}