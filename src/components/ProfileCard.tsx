import Image from 'next/image';
import { photoUrl } from '@/lib/photos';
import Button from '@/components/ui/Button';

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

// Dégradé chaud déterministe pour les profils sans photo — puisé dans les
// tokens implémentés (coral / terracotta). « Place aux visages » : même sans
// photo, la carte reste une surface émotionnelle, jamais un gris clinique.
const PLACEHOLDER_GRADIENTS = [
  'from-coral-light to-coral-dark',
  'from-sand via-coral-light to-terracotta',
  'from-coral to-terracotta',
];

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_GRADIENTS[h % PLACEHOLDER_GRADIENTS.length];
}

export default function ProfileCard({
  id,
  displayName,
  age,
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
  const hasPhoto = !!(photos && photos.length > 0);
  const chips = [...(interests ?? []), ...(practices ?? [])].slice(0, 3);

  return (
    <article
      aria-label={`Profil de ${displayName}`}
      className="group overflow-hidden rounded-2xl border border-coral/10 bg-white shadow-sm dark:border-coral-light/10 dark:bg-gray-900"
    >
      {/* Photo plein cadre — cliquable pour ouvrir le profil */}
      <button
        type="button"
        onClick={() => onProfileClick?.(id)}
        aria-label={`Voir le profil de ${displayName}`}
        className="relative block aspect-[5/6] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-inset"
      >
        {hasPhoto ? (
          <Image
            src={photoUrl(photos![0])}
            alt={displayName}
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            unoptimized
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(displayName)}`}
          >
            <span className="text-6xl font-bold text-white/90">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Scrim pour la lisibilité du texte en surimpression */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        {/* Chips haut-droite : présence + distance */}
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          {online && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 ring-2 ring-green-400/30" />
              En ligne
            </span>
          )}
          {distance && (
            <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {distance}
            </span>
          )}
        </div>

        {/* Identité en surimpression */}
        <div className="absolute inset-x-4 bottom-3 text-white">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-xl font-bold tracking-tight">
              {displayName}
              {age != null ? `, ${age}` : ''}
            </h3>
            {isVerified && (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-white"
                fill="currentColor"
                aria-label="Profil vérifié"
                role="img"
              >
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            )}
          </div>
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Actions — une seule action primaire, cibles ≥ 44px */}
      <div className="flex gap-3 p-3">
        <Button type="button" variant="secondary" fullWidth onClick={onPass} aria-label={`Passer ${displayName}`}>
          Passer
        </Button>
        <Button type="button" variant="primary" fullWidth onClick={onLike} aria-label={`J'aime ${displayName}`}>
          J&apos;aime
        </Button>
      </div>
    </article>
  );
}
