'use client';

import { useState, useEffect, useCallback } from 'react';
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

      {!error && crossings.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-6 text-center">
          <p className="text-muted">
            Aucun croisement pour le moment. Vos chemins se croiseront bientôt.
          </p>
        </div>
      )}

      <div className="space-y-4">
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
      </div>
      <ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </>
  );
}
