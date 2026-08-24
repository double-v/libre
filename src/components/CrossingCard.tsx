import VerificationBadge from '@/components/VerificationBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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

/**
 * Carte de croisement — cellule de la grille « Croisements » (#348).
 *
 * Pas de média : un croisement n'a pas de photo à montrer, il a un moment et
 * un lieu approximatif. La tête de carte porte donc l'instant, le corps la
 * personne — la même silhouette que `ProfileCard` sans en mimer la photo.
 */
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

  // Liker ne doit pas ouvrir la fiche par-dessus l'action (cf. ProfileCard).
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
      aria-label={`Croisement avec ${displayName}`}
      onClick={() => onProfileClick?.(id)}
      className="flex h-full flex-col"
    >
      <div className="bg-sunken p-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1.5 text-xs font-semibold text-coral-dark dark:text-coral-light">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {timeAgo}
        </span>

        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            // Même raison que ProfileCard : sur `sunken`, un cercle `blush`
            // serait invisible en clair.
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface text-xl font-semibold text-coral-dark dark:text-coral-light"
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 truncate text-lg font-semibold text-content">
                {displayName}{age != null ? `, ${age}` : ''}
              </h3>
              <VerificationBadge isVerified={isVerified} />
            </div>
            <p className="mt-0.5 text-sm text-muted">à {formatDistance(distanceM)} de toi</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-3 text-sm text-muted">
          {bio || 'Profil sans description pour l’instant.'}
        </p>

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
