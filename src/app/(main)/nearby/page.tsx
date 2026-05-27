'use client';

import { useState, useCallback } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import ProfileCard from '@/components/ProfileCard';

interface NearbyUser {
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
  distanceKm: number;
}

export default function NearbyPage() {
  const geo = useGeolocation();
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNearby = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setError('');

    try {
      const updateRes = await fetch('/api/geoloc/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update location');
      }

      const nearbyRes = await fetch('/api/geoloc/nearby');
      if (!nearbyRes.ok) {
        throw new Error('Failed to fetch nearby users');
      }

      const data = await nearbyRes.json();
      setNearby(data.nearby);
    } catch {
      setError('Impossible de charger les personnes a proximite');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger fetch once geolocation is resolved
  if (!geo.loading && geo.latitude != null && geo.longitude != null && !loading && nearby.length === 0 && !error) {
    fetchNearby(geo.latitude, geo.longitude);
  }

  async function handleLike(userId: string) {
    try {
      await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedId: userId }),
      });
    } catch {
      // Silently fail — card is still removed from list
    }
    setNearby((prev) => prev.filter((u) => u.id !== userId));
  }

  function handlePass(userId: string) {
    setNearby((prev) => prev.filter((u) => u.id !== userId));
  }

  // Geolocation loading
  if (geo.loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Localisation en cours...</p>
      </div>
    );
  }

  // Geolocation error
  if (geo.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">A proximite</h1>
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Geolocalisation indisponible : {geo.error}
        </div>
      </div>
    );
  }

  // Data loading
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">A proximite</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && nearby.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Personne a proximite pour le moment.
        </p>
      )}

      <div className="space-y-4">
        {nearby.map((user) => (
          <ProfileCard
            key={user.id}
            id={user.id}
            displayName={user.displayName}
            bio={user.profile.bio ?? ''}
            isVerified={user.isVerified}
            distanceKm={user.distanceKm}
            photos={user.profile.photos}
            onLike={() => handleLike(user.id)}
            onPass={() => handlePass(user.id)}
          />
        ))}
      </div>
    </div>
  );
}