'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ProfileCard from '@/components/ProfileCard';
import ProfileModal from '@/components/ProfileModal';
import DiscoverFilters from '@/components/DiscoverFilters';
import EmptyStateCards from '@/components/EmptyStateCards';
import Button from '@/components/ui/Button';

type Tab = 'online' | 'nearby' | 'all';
type NearbyReason = 'geoloc_required' | 'empty_feed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'online', label: 'En ligne' },
  { key: 'nearby', label: 'À proximité' },
  { key: 'all', label: 'Tous' },
];

const RADIUS_STEPS = [10, 25, 50, 100] as const;

function closestRadiusIndex(value: number): number {
  let closest = 0;
  let minDiff = Infinity;
  RADIUS_STEPS.forEach((step, i) => {
    const diff = Math.abs(step - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  });
  return closest;
}

interface DiscoveredUser {
  userId: string;
  displayName: string;
  bio: string;
  age: number | null;
  genderIdentity: string;
  orientation: string[];
  interests: string[];
  practices: string[];
  photos: string[];
  isVerified: boolean;
  online: boolean;
  distanceKm?: number;
}

interface FilterState {
  gender: string[];
  orientation: string[];
  ageMin: number;
  ageMax: number;
  interests: string[];
}

function buildUrl(tab: Tab, cursor?: string, filters?: FilterState): string {
  const params = new URLSearchParams({ tab });
  if (cursor) params.set('cursor', cursor);
  if (filters) {
    if (filters.gender.length) params.set('gender', filters.gender.join(','));
    if (filters.orientation.length) params.set('orientation', filters.orientation.join(','));
    if (filters.ageMin > 18) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax < 99) params.set('ageMax', String(filters.ageMax));
    if (filters.interests.length) params.set('interests', filters.interests.join(','));
  }
  return `/api/discover?${params}`;
}

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    gender: [],
    orientation: [],
    ageMin: 18,
    ageMax: 99,
    interests: [],
  });
  const [users, setUsers] = useState<DiscoveredUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [nearbyReason, setNearbyReason] = useState<NearbyReason | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [radiusReady, setRadiusReady] = useState(false);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [geoRequesting, setGeoRequesting] = useState(false);
  const [geoError, setGeoError] = useState('');
  const fetchIdRef = useRef(0);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(false);
      try {
        const url = buildUrl(tab, reset ? undefined : cursor ?? undefined, filters);
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        if (fetchId !== fetchIdRef.current) return; // stale
        const data = await res.json();
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setCursor(data.nextCursor);
        setNearbyReason(data.reason ?? null);
      } catch {
        if (fetchId === fetchIdRef.current) setError(true);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    },
    [tab, cursor, filters],
  );

  // Fetch on tab or filter change (reset)
  useEffect(() => {
    setCursor(null);
    setUsers([]);
    setPassedIds(new Set());
    setNearbyReason(null);
    setGeoError('');
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const url = buildUrl(tab, undefined, filters);
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        if (fetchId !== fetchIdRef.current) return;
        const data = await res.json();
        setUsers(data.users);
        setCursor(data.nextCursor);
        setNearbyReason(data.reason ?? null);
      } catch {
        if (fetchId === fetchIdRef.current) setError(true);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    })();
  }, [tab, filters]);

  // Load the saved search radius once, when the nearby tab is first opened
  useEffect(() => {
    if (tab !== 'nearby' || radiusReady) return;
    (async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.maxDistanceKm) setRadiusKm(data.profile.maxDistanceKm);
        }
      } catch {
        // garde le rayon par défaut
      } finally {
        setRadiusReady(true);
      }
    })();
  }, [tab, radiusReady]);

  async function handleRadiusChange(newRadius: number) {
    if (radiusSaving || newRadius === radiusKm) return;
    const previous = radiusKm;
    setRadiusKm(newRadius);
    setRadiusSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDistanceKm: newRadius }),
      });
      if (!res.ok) throw new Error();
      await fetchPage(true);
    } catch {
      setRadiusKm(previous);
    } finally {
      setRadiusSaving(false);
    }
  }

  function handleActivateGeoloc() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoRequesting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/geoloc/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (!res.ok) throw new Error();
          await fetchPage(true);
        } catch {
          setGeoError('Impossible d\'enregistrer ta position, réessaie plus tard.');
        } finally {
          setGeoRequesting(false);
        }
      },
      () => {
        setGeoError(
          "Géolocalisation refusée. Autorise l'accès dans les réglages de ton navigateur pour voir les célibataires à proximité.",
        );
        setGeoRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const handleTabChange = (newTab: Tab) => setTab(newTab);

  const handleFilterChange = (newFilters: FilterState) => setFilters(newFilters);

  const handleLike = async (userId: string) => {
    setPassedIds((prev) => new Set(prev).add(userId));
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          // The MatchDialog in the layout will handle Pusher notification,
          // but the liker gets instant feedback here
          const matchedUser = users.find((u) => u.userId === userId);
          if (matchedUser && typeof window !== 'undefined') {
            // Dispatch custom event for MatchDialog or direct notification
            window.dispatchEvent(new CustomEvent('libre:instant-match', {
              detail: {
                matchId: data.matchId,
                matchedWith: {
                  id: userId,
                  displayName: matchedUser.displayName,
                  photos: matchedUser.photos,
                },
              },
            }));
          }
        }
      }
    } catch {
      // Silently fail
    }
  };

  const handlePass = (userId: string) => {
    setPassedIds((prev) => new Set(prev).add(userId));
  };

  const visibleUsers = users.filter((u) => !passedIds.has(u.userId));

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Découvrir</h1>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-label="Filtres"
        >
          {showFilters ? 'Fermer' : 'Filtres'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => handleTabChange(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="mb-4">
          <DiscoverFilters
            gender={filters.gender}
            orientation={filters.orientation}
            ageMin={filters.ageMin}
            ageMax={filters.ageMax}
            interests={filters.interests}
            onChange={handleFilterChange}
          />
        </div>
      )}

      {/* Rayon de recherche (onglet à proximité) */}
      {tab === 'nearby' && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label
            htmlFor="nearby-radius"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
          >
            Rayon de recherche : {radiusKm} km
          </label>
          <input
            id="nearby-radius"
            type="range"
            min={0}
            max={RADIUS_STEPS.length - 1}
            step={1}
            value={closestRadiusIndex(radiusKm)}
            disabled={radiusSaving}
            onChange={(e) => handleRadiusChange(RADIUS_STEPS[Number(e.target.value)])}
            aria-valuetext={`${radiusKm} kilomètres`}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-coral disabled:opacity-50 dark:bg-gray-700"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {RADIUS_STEPS.map((step) => (
              <span key={step}>{step} km</span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading && visibleUsers.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500">Une erreur est survenue, veuillez réessayer</p>
      ) : tab === 'nearby' && nearbyReason === 'geoloc_required' ? (
        <div className="animate-fade-in rounded-xl border border-dashed border-coral/40 bg-blush p-6 text-center dark:border-coral/30 dark:bg-coral/5">
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Active ta géoloc pour voir les célibataires près de toi
          </p>
          <Button type="button" onClick={handleActivateGeoloc} loading={geoRequesting}>
            Activer ma géolocalisation
          </Button>
          {geoError && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {geoError}
            </p>
          )}
        </div>
      ) : tab === 'nearby' && nearbyReason === 'empty_feed' ? (
        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">
            Personne dans un rayon de {radiusKm} km. Élargis ta recherche ou reviens plus tard.
          </p>
        </div>
      ) : visibleUsers.length === 0 ? (
        <EmptyStateCards context={tab === 'online' ? 'en ligne' : tab === 'nearby' ? 'à proximité' : 'à découvrir'} />
      ) : (
        <div className="space-y-4">
          {visibleUsers.map((user) => (
            <ProfileCard
              key={user.userId}
              id={user.userId}
              displayName={user.displayName}
              age={user.age ?? undefined}
              bio={user.bio}
              isVerified={user.isVerified}
              online={user.online}
              distanceKm={user.distanceKm}
              photos={user.photos}
              interests={user.interests}
              practices={user.practices}
              onLike={() => handleLike(user.userId)}
              onPass={() => handlePass(user.userId)}
              onProfileClick={(id) => setSelectedUserId(id)}
            />
          ))}

          {cursor && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => fetchPage(false)}
              loading={loading}
            >
              {loading ? 'Chargement…' : 'Charger plus'}
            </Button>
          )}
        </div>
      )}
      <ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}