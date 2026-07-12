'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ProfileCard from '@/components/ProfileCard';
import ProfileModal from '@/components/ProfileModal';
import SearchFilters, { EMPTY_SEARCH_FILTERS, hasActiveFilters, type SearchFiltersValue } from '@/components/SearchFilters';
import EmptyStateCards from '@/components/EmptyStateCards';
import CrossingsView from '@/components/CrossingsView';
import Button from '@/components/ui/Button';

// Onglet unique de découverte : un seul écran, trois façons de rencontrer.
// « Pour toi » = feed algorithmique, « À proximité » = rayon géoloc,
// « Croisements » = personnes croisées en chemin.
type Segment = 'pourtoi' | 'nearby' | 'crossings';
type FeedTab = 'all' | 'nearby';
type NearbyReason = 'geoloc_required' | 'empty_feed';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'pourtoi', label: 'Pour toi' },
  { key: 'nearby', label: 'À proximité' },
  { key: 'crossings', label: 'Croisements' },
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

function buildUrl(tab: FeedTab, cursor?: string, filters?: SearchFiltersValue): string {
  const params = new URLSearchParams({ tab });
  if (cursor) params.set('cursor', cursor);
  if (filters) {
    if (filters.genders.length) params.set('gender', filters.genders.join(','));
    if (filters.orientations.length) params.set('orientation', filters.orientations.join(','));
    if (filters.ageMin > 18) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax < 99) params.set('ageMax', String(filters.ageMax));
    if (filters.interests.length) params.set('interests', filters.interests.join(','));
  }
  return `/api/discover?${params}`;
}

export default function DiscoverPage() {
  const [segment, setSegment] = useState<Segment>('pourtoi');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersValue>(EMPTY_SEARCH_FILTERS);
  // Les filtres persistés (Profile) sont chargés au montage : tant qu'ils ne le
  // sont pas, on ne lance pas le feed, pour éviter un flash de profils non
  // filtrés puis un re-fetch (#235).
  const [filtersReady, setFiltersReady] = useState(false);
  const [users, setUsers] = useState<DiscoveredUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<'none' | 'rate' | 'generic'>('none');
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [nearbyReason, setNearbyReason] = useState<NearbyReason | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [geoRequesting, setGeoRequesting] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [activeFeedKey, setActiveFeedKey] = useState('');
  const fetchIdRef = useRef(0);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le segment « Croisements » a sa propre vue et ne consomme pas le feed.
  const isFeed = segment !== 'crossings';
  const feedTab: FeedTab = segment === 'nearby' ? 'nearby' : 'all';
  // Identité du feed courant : change quand on switche d'onglet ou de filtres.
  const feedKey = isFeed ? `${feedTab}|${JSON.stringify(filters)}` : 'crossings';

  // Reset du feed quand son identité change — fait pendant le rendu (pattern
  // React officiel « ajuster l'état pendant le rendu »), pas dans un effet :
  // évite les setState synchrones en effet (react-hooks/set-state-in-effect,
  // cf. #179) et les renders en cascade.
  // https://react.dev/learn/you-might-not-need-an-effect
  if (feedKey !== activeFeedKey) {
    setActiveFeedKey(feedKey);
    if (isFeed) {
      setUsers([]);
      setCursor(null);
      setPassedIds(new Set());
      setNearbyReason(null);
      setErrorKind('none');
      setGeoError('');
      setLoading(true);
    }
  }

  const fetchPage = useCallback(
    async (reset: boolean) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setErrorKind('none');
      try {
        const url = buildUrl(feedTab, reset ? undefined : cursor ?? undefined, filters);
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status === 429 ? 'rate' : 'generic');
        if (fetchId !== fetchIdRef.current) return; // stale
        const data = await res.json();
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setCursor(data.nextCursor);
        setNearbyReason(data.reason ?? null);
      } catch (e) {
        if (fetchId === fetchIdRef.current) {
          setErrorKind(e instanceof Error && e.message === 'rate' ? 'rate' : 'generic');
        }
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    },
    [feedTab, cursor, filters],
  );

  // Fetch on segment or filter change (reset). Skipped for « Croisements ».
  // Le reset d'état (users/cursor/…) est fait pendant le rendu ci-dessus ; cet
  // effet ne fait que l'appel réseau, sans aucun setState synchrone dans son
  // corps (les setState vivent dans la closure async, après le premier await).
  useEffect(() => {
    if (!isFeed || !filtersReady) return;
    const fetchId = ++fetchIdRef.current;
    (async () => {
      try {
        const url = buildUrl(feedTab, undefined, filters);
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status === 429 ? 'rate' : 'generic');
        if (fetchId !== fetchIdRef.current) return;
        const data = await res.json();
        setUsers(data.users);
        setCursor(data.nextCursor);
        setNearbyReason(data.reason ?? null);
      } catch (e) {
        if (fetchId === fetchIdRef.current) {
          setErrorKind(e instanceof Error && e.message === 'rate' ? 'rate' : 'generic');
        }
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    })();
  }, [isFeed, feedTab, filters, filtersReady]);

  // Charge les préférences de recherche persistées (Profile) au montage :
  // filtres + rayon, source unique partagée avec /profil (#235). Tant que ce
  // n'est pas fait, le feed est en attente (filtersReady) pour ne pas afficher
  // un feed non filtré. Échec réseau → on garde les valeurs par défaut.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          if (p) {
            setFilters({
              genders: p.searchGenders ?? [],
              orientations: p.searchOrientations ?? [],
              ageMin: p.ageMin ?? 18,
              ageMax: p.ageMax ?? 99,
              interests: p.searchInterests ?? [],
            });
            if (p.maxDistanceKm) setRadiusKm(p.maxDistanceKm);
          }
        }
      } catch {
        // garde les valeurs par défaut
      } finally {
        setFiltersReady(true);
      }
    })();
  }, []);

  // Persistance best-effort des filtres (debounce) : le slider d'âge émet
  // beaucoup d'events, on ne PUT qu'après une pause. Les filtres restent
  // appliqués en session même si l'écriture échoue (cf. pusher best-effort).
  const persistFilters = useCallback((f: SearchFiltersValue) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchGenders: f.genders,
          searchOrientations: f.orientations,
          ageMin: f.ageMin,
          ageMax: f.ageMax,
          searchInterests: f.interests,
        }),
      }).catch(() => { /* best-effort */ });
    }, 600);
  }, []);
  // Pas de clear au démontage : le timer ne fait qu'un fetch fire-and-forget
  // (aucun setState), donc laisser la dernière écriture partir même si on quitte
  // /discover rapidement garantit que le dernier changement de filtre est bien
  // persisté (sinon on perdrait l'édition faite < 600 ms avant la navigation).

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

  const handleFilterChange = (newFilters: SearchFiltersValue) => {
    setFilters(newFilters);
    persistFilters(newFilters);
  };

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
          const matchedUser = users.find((u) => u.userId === userId);
          if (matchedUser && typeof window !== 'undefined') {
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
        <h1 className="text-2xl font-bold text-content">Découvrir</h1>
        {isFeed && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label={hasActiveFilters(filters) ? 'Filtres (actifs)' : 'Filtres'}
          >
            <span className="inline-flex items-center gap-1.5">
              {showFilters ? 'Fermer' : 'Filtres'}
              {!showFilters && hasActiveFilters(filters) && (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
              )}
            </span>
          </Button>
        )}
      </div>

      {/* Sélecteur segmenté — le cœur de la navigation de découverte */}
      <div className="mb-4 flex rounded-xl bg-fill-subtle p-1" role="tablist">
        {SEGMENTS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={segment === key}
            onClick={() => setSegment(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              segment === key
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters (collapsible) — feed segments only */}
      {isFeed && showFilters && (
        <div className="mb-4">
          <SearchFilters value={filters} onChange={handleFilterChange} />
        </div>
      )}

      {/* Rayon de recherche (segment à proximité) */}
      {segment === 'nearby' && (
        <div className="mb-4 rounded-xl border border-hairline bg-surface p-4">
          <label
            htmlFor="nearby-radius"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fill-subtle accent-coral disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            {RADIUS_STEPS.map((step) => (
              <span key={step}>{step} km</span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {segment === 'crossings' ? (
        <CrossingsView />
      ) : loading && visibleUsers.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      ) : errorKind !== 'none' && visibleUsers.length === 0 ? (
        <div className="animate-fade-in rounded-xl border border-coral/20 bg-blush p-6 text-center dark:border-coral/20 dark:bg-coral/5">
          <p className="text-muted">
            {errorKind === 'rate'
              ? 'Doucement 🙂 tu vas un peu vite. Réessaie dans quelques secondes.'
              : 'Impossible de charger les profils pour le moment.'}
          </p>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => fetchPage(true)} loading={loading}>
              Réessayer
            </Button>
          </div>
        </div>
      ) : segment === 'nearby' && nearbyReason === 'geoloc_required' ? (
        <div className="animate-fade-in rounded-xl border border-dashed border-coral/40 bg-blush p-6 text-center dark:border-coral/30 dark:bg-coral/5">
          <p className="mb-4 text-muted">
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
      ) : segment === 'nearby' && nearbyReason === 'empty_feed' ? (
        <div className="animate-fade-in rounded-xl border border-hairline bg-surface p-6 text-center">
          <p className="text-muted">
            Personne dans un rayon de {radiusKm} km. Élargis ta recherche ou reviens plus tard.
          </p>
        </div>
      ) : visibleUsers.length === 0 ? (
        <EmptyStateCards context={segment === 'nearby' ? 'à proximité' : 'à découvrir'} />
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
