'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import CrossingCard from '@/components/CrossingCard';
import ProfileModal from '@/components/ProfileModal';

interface Crossing {
  id: string;
  displayName: string;
  isVerified: boolean;
  profile: {
    bio?: string;
    genderIdentity: string;
    orientation: string[];
    relationshipType: string[];
    interests: string[];
    photos: string[];
  };
  distanceM: number;
  happenedAt: string;
}

/**
 * Rappel de la promesse de flou, en cellule de grille (#348).
 *
 * `seule` : quand le nombre de croisements tombe juste sur la rangée, cette
 * cellule ouvrirait une rangée pour elle toute seule — elle s'étale alors sur
 * la largeur au lieu de flotter à gauche. La parité diffère selon le nombre de
 * colonnes servi, d'où les deux paliers.
 */
function GeolocPromiseCard({ crossings }: { crossings: number }) {
  const classes = [
    crossings % 2 === 0 ? 'md:col-span-2' : '',
    crossings % 3 === 0 ? 'lg:col-span-3' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-3 rounded-card border border-hairline bg-sunken p-6 ${classes}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush dark:bg-coral/15">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-coral dark:text-coral-light" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      </span>
      <h3 className="text-base font-semibold text-content">Ta position reste floue</h3>
      <p className="text-sm leading-relaxed text-muted">
        Ta position est brouillée sur ton appareil avant d’être envoyée, et les
        distances sont arrondies. Personne ne peut remonter à ton adresse, nous
        compris.
      </p>
      <Link
        href="/trust/how-it-works"
        className="mt-auto inline-flex min-h-[44px] items-center text-sm font-semibold text-coral hover:text-terracotta focus-visible:outline-none focus-visible:shadow-focus dark:text-coral-light"
      >
        Comment ça marche →
      </Link>
    </div>
  );
}

/**
 * Vue « Croisements » — les personnes dont le chemin a croisé le tien.
 * Rendue comme sous-vue de l'onglet Découvrir (segment « Croisements »),
 * elle ne porte donc ni titre ni wrapper : le parent s'en charge.
 */
export default function CrossingsView() {
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchCrossings = useCallback(async () => {
    try {
      const res = await fetch('/api/geoloc/crossings');
      if (!res.ok) {
        throw new Error('Failed to fetch crossings');
      }
      const data = await res.json();
      setCrossings(data.crossings);
    } catch {
      setError('Impossible de charger les croisements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      await fetchCrossings();
    })();
  }, [fetchCrossings]);

  async function handleLike(userId: string) {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          const matchedUser = crossings.find((c) => c.id === userId);
          if (matchedUser && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('libre:instant-match', {
              detail: {
                matchId: data.matchId,
                matchedWith: {
                  id: userId,
                  displayName: matchedUser.displayName,
                  photos: matchedUser.profile.photos,
                },
              },
            }));
          }
        }
      }
    } catch {
      // Silently fail
    }
    setCrossings((prev) => prev.filter((c) => c.id !== userId));
  }

  function handlePass(userId: string) {
    setCrossings((prev) => prev.filter((c) => c.id !== userId));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <p className="mb-6 max-w-reading text-sm leading-relaxed text-muted">
        Des personnes dont le chemin a recoupé le tien. Rien n’est partagé de ton
        trajet — seulement le fait que vous vous soyez trouvés au même endroit, à
        peu près au même moment.
      </p>

      {!error && crossings.length === 0 && (
        <div className="mx-auto mb-5 max-w-reading rounded-xl border border-hairline bg-surface p-6 text-center">
          <p className="text-muted">
            Aucun croisement pour le moment. Vos chemins se croiseront bientôt.
          </p>
        </div>
      )}

      <div className="grid gap-grid md:grid-cols-2 lg:grid-cols-3">
        {crossings.map((crossing) => (
          <CrossingCard
            key={crossing.id}
            id={crossing.id}
            displayName={crossing.displayName}
            isVerified={crossing.isVerified}
            distanceM={crossing.distanceM}
            happenedAt={crossing.happenedAt}
            bio={crossing.profile.bio}
            onLike={() => handleLike(crossing.id)}
            onPass={() => handlePass(crossing.id)}
            onProfileClick={(id) => setSelectedUserId(id)}
          />
        ))}

        {/* Une rangée de croisements est presque toujours incomplète : plutôt
            qu'un trou, la cellule restante explique ce que la géoloc laisse
            filtrer — c'est là que la question se pose. */}
        <GeolocPromiseCard crossings={crossings.length} />
      </div>
      <ProfileModal
        userId={selectedUserId ?? ''}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onBlocked={(id) => setCrossings((prev) => prev.filter((c) => c.id !== id))}
      />
    </>
  );
}
