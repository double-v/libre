'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ProfileCard from '@/components/ProfileCard';
import ProfileModal from '@/components/ProfileModal';
import DiscoverFilters from '@/components/DiscoverFilters';
import EmptyStateCards from '@/components/EmptyStateCards';

type Tab = 'online' | 'nearby' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'online', label: 'En ligne' },
  { key: 'nearby', label: 'À proximité' },
  { key: 'all', label: 'Tous' },
];

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
      } catch {
        if (fetchId === fetchIdRef.current) setError(true);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    })();
  }, [tab, filters]);

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
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
          aria-expanded={showFilters}
          aria-label="Filtres"
        >
          {showFilters ? 'Fermer' : 'Filtres'}
        </button>
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

      {/* Content */}
      {loading && visibleUsers.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500">Une erreur est survenue, veuillez réessayer</p>
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
            <button
              type="button"
              onClick={() => fetchPage(false)}
              disabled={loading}
              className="w-full rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {loading ? 'Chargement…' : 'Charger plus'}
            </button>
          )}
        </div>
      )}
      <ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}