import Image from 'next/image';
import { photoUrl } from '@/lib/photos';
import VerificationBadge from '@/components/VerificationBadge';

interface PublicProfilePreviewProps {
  displayName?: string;
  age?: number;
  bio: string;
  photos: string[];
  interests: string[];
  isVerified: boolean;
  distanceKm?: number;
}

function formatDistance(km?: number): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function PublicProfilePreview({
  displayName = 'Vous',
  age,
  bio,
  photos,
  interests,
  isVerified,
  distanceKm,
}: PublicProfilePreviewProps) {
  const distance = formatDistance(distanceKm);
  const heroPhoto = photos[0];

  return (
    <article
      aria-label="Aperçu public de votre profil"
      className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-sm"
    >
      {heroPhoto ? (
        <div className="relative aspect-[4/5] w-full bg-fill-subtle">
          <Image
            src={photoUrl(heroPhoto)}
            alt={`Photo de ${displayName}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 24rem"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-blush to-sand dark:from-coral/20 dark:to-coral-dark/20">
          <span className="text-4xl font-semibold text-coral-dark dark:text-coral-light">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-content">
            {displayName}{age != null ? `, ${age}` : ''}
          </h2>
          {isVerified && <VerificationBadge isVerified />}
        </div>

        {distance && (
          <p className="text-sm text-muted">à {distance}</p>
        )}

        {bio && (
          <p className="text-sm text-muted">{bio}</p>
        )}

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {interests.map((interest) => (
              <span
                key={interest}
                className="inline-block rounded-full bg-fill-subtle px-2.5 py-0.5 text-xs font-medium text-muted"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
