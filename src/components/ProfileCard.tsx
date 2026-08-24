import VerificationBadge from '@/components/VerificationBadge';
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

/**
 * Carte de profil — cellule de la grille de Découvrir (#348).
 *
 * Photo-first : un média 4/5 à fleur des bords, puis le texte. La carte
 * n'énonce aucune largeur — elle remplit sa cellule et s'étire en hauteur
 * (`h-full` + `mt-auto` sur les actions) pour que deux cartes voisines de
 * bios inégales alignent quand même leurs boutons.
 */
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
  const cover = photos?.[0];

  // Liker ne doit pas ouvrir la fiche : sans ça, le clic remonte à la carte
  // et l'action se double d'une modale par-dessus.
  const withoutBubbling = (action: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    action();
  };

  return (
    <Card
      as="article"
      variant="media"
      interactive={!!onProfileClick}
      role="group"
      aria-label={`Profil de ${displayName}`}
      onClick={() => onProfileClick?.(id)}
      className="flex h-full flex-col"
    >
      {/* 6/5 sous `md`, 4/5 au-delà : à 358px de colonne, un 4/5 fait 448px de
          média et ne laisse plus qu'une carte à l'écran. Le canvas mobile
          dessine 300px — c'est ce que donne le 6/5. */}
      <div className="relative aspect-[6/5] w-full bg-sunken md:aspect-[4/5]">
        {cover ? (
          <SensitivePhoto
            photoKey={cover}
            alt={displayName}
            size="fill"
            veiled={veiledPhotos?.includes(cover)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <span
              aria-hidden="true"
              // `bg-surface` et non `bg-blush` : en clair, blush EST le fond
              // `sunken` du média — le cercle disparaîtrait dans son support.
              className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-3xl font-semibold text-coral-dark dark:text-coral-light"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            {/* Dire le manque plutôt que de le maquiller : une silhouette muette
                laisserait croire à une photo qui n'a pas chargé. */}
            <span className="text-xs text-muted">Pas encore de photo</span>
          </div>
        )}

        {online && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-content backdrop-blur-sm">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            En ligne
          </span>
        )}

        {distance && (
          // Contraste tenu sur n'importe quelle photo : voile sombre en dur,
          // pas un token de surface qui virerait clair sur une image claire.
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {distance}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-lg font-semibold text-content">
            {displayName}{age != null ? `, ${age}` : ''}
          </h3>
          <VerificationBadge isVerified={isVerified} />
        </div>

        {/* Une bio vide laissait un trou entre le nom et les actions : le dire
            occupe la place et reste honnête. */}
        <p className="mt-2 line-clamp-3 text-sm text-muted">
          {bio || 'Profil sans description pour l’instant.'}
        </p>

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

        {/* `mt-auto` : deux cartes voisines de bios inégales alignent quand même leurs actions. */}
        <div className="mt-auto flex gap-2 pt-4 [&>button]:flex-1">
          <Button
            type="button"
            variant="secondary"
            onClick={withoutBubbling(onPass)}
            aria-label={`Passer ${displayName}`}
          >
            Passer
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={withoutBubbling(onLike)}
            aria-label={`Like ${displayName}`}
          >
            Like
          </Button>
        </div>
      </div>
    </Card>
  );
}
