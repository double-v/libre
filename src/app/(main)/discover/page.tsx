'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from '@/components/ProfileCard';
import ProfileModal from '@/components/ProfileModal';
import SearchFilters, { EMPTY_SEARCH_FILTERS, hasActiveFilters, type SearchFiltersValue } from '@/components/SearchFilters';
import GridFillerCards from '@/components/GridFillerCards';
import CrossingsView from '@/components/CrossingsView';
import Button from '@/components/ui/Button';
import SiteShell from '@/components/ui/SiteShell';
import { classifyGeolocError, fuzzedPosition, geolocFailureMessage, geolocFallbackPrompt, geolocUpdateMessage } from '@/lib/geoloc-client';
import CityPicker from '@/components/ui/CityPicker';
import { defaultSaveCity } from '@/components/ProfilePositionCard';
import { deriveMissing, isNudgeDismissed, mustOnboard, writeStoredDate, NUDGE_DISMISS_KEY, type MissingKind } from '@/lib/onboarding';
import ProfileNudgeCard from '@/components/ProfileNudgeCard';
import { useFeatures } from '@/hooks/useFeatures';

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

interface DiscoveredUser {
  userId: string;
  displayName: string;
  bio: string;
  age: number | null;
  genderIdentity: string;
  orientation: string[];
  interests: string[];
  /** Absent quand le profil réserve ses pratiques à ses matches (#328). */
  practices?: string[];
  photos: string[];
  isVerified: boolean;
  online: boolean;
  distanceKm?: number;
  distanceBucket?: string;
  /** Clés servies floutées à ce lecteur (#330). */
  veiledPhotos?: string[];
}

function buildUrl(tab: FeedTab, cursor?: string, filters?: SearchFiltersValue): string {
  const params = new URLSearchParams({ tab });
  if (cursor) params.set('cursor', cursor);
  if (filters) {
    if (filters.genders.length) params.set('gender', filters.genders.join(','));
    if (filters.orientations.length) params.set('orientation', filters.orientations.join(','));
    if (filters.relationshipTypes.length) params.set('relationshipType', filters.relationshipTypes.join(','));
    if (filters.ageMin > 18) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax < 99) params.set('ageMax', String(filters.ageMax));
    if (filters.interests.length) params.set('interests', filters.interests.join(','));
    // Paramètre absent = « partout » : le serveur ne doit pas deviner un rayon.
    if (filters.distanceKm !== null) params.set('distance', String(filters.distanceKm));
  }
  return `/api/discover?${params}`;
}

export default function DiscoverPage() {
  const [segment, setSegment] = useState<Segment>('pourtoi');
  const features = useFeatures();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersValue>(EMPTY_SEARCH_FILTERS);
  // Les filtres persistés (Profile) sont chargés au montage : tant qu'ils ne le
  // sont pas, on ne lance pas le feed, pour éviter un flash de profils non
  // filtrés puis un re-fetch (#235).
  const [filtersReady, setFiltersReady] = useState(false);
  const router = useRouter();
  // Carte de relance (spec 005) : ce qui manque au profil pour être choisi,
  // ou null. Décidé une fois au chargement du profil, écartable 7 jours par
  // appareil.
  const [nudgeKind, setNudgeKind] = useState<MissingKind | null>(null);
  const [users, setUsers] = useState<DiscoveredUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<'none' | 'rate' | 'generic'>('none');
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [nearbyReason, setNearbyReason] = useState<NearbyReason | null>(null);
  const [geoRequesting, setGeoRequesting] = useState(false);
  const [geoError, setGeoError] = useState('');
  // Repli « ville » (spec 004, #406) : libellé de l'invite, ou null tant que la
  // géoloc n'a pas échoué. Un appareil sans géolocalisation l'affiche d'emblée.
  const [geoFallback, setGeoFallback] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      if (typeof navigator !== 'undefined' && !navigator.geolocation) {
        setGeoFallback(geolocFallbackPrompt('unsupported'));
      }
    })();
  }, []);
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
          // Parcours d'accueil (spec 005) : tant qu'il n'est pas terminé, on y
          // envoie avant de charger le feed — c'est la seule porte d'entrée
          // fiable, l'inscription ne connectant pas (vérification e-mail).
          // Un profil absent vaut « rien commencé ».
          if (mustOnboard(p)) {
            router.replace('/bienvenue');
            return; // filtersReady reste faux : le feed ne part pas
          }
          if (p) {
            if (!isNudgeDismissed()) {
              setNudgeKind(deriveMissing({ ...p, photos: p.photos ?? [], relationshipType: p.relationshipType ?? [] }));
            }
            setFilters({
              genders: p.searchGenders ?? [],
              orientations: p.searchOrientations ?? [],
              relationshipTypes: p.searchRelationshipTypes ?? [],
              ageMin: p.ageMin ?? 18,
              ageMax: p.ageMax ?? 99,
              interests: p.searchInterests ?? [],
              distanceKm: p.searchDistanceKm ?? null,
            });
          }
        }
        setFiltersReady(true);
      } catch {
        // garde les valeurs par défaut
        setFiltersReady(true);
      }
    })();
    // Une seule lecture au montage (comme avant la garde) ; le router est
    // stable côté Next, on ne relance pas le chargement sur lui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          searchRelationshipTypes: f.relationshipTypes,
          ageMin: f.ageMin,
          ageMax: f.ageMax,
          searchInterests: f.interests,
          searchDistanceKm: f.distanceKm,
        }),
      }).catch(() => { /* best-effort */ });
    }, 600);
  }, []);
  // Pas de clear au démontage : le timer ne fait qu'un fetch fire-and-forget
  // (aucun setState), donc laisser la dernière écriture partir même si on quitte
  // /discover rapidement garantit que le dernier changement de filtre est bien
  // persisté (sinon on perdrait l'édition faite < 600 ms avant la navigation).

  function handleActivateGeoloc() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError(geolocFailureMessage('unsupported'));
      setGeoFallback(geolocFallbackPrompt('unsupported'));
      return;
    }
    setGeoRequesting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/geoloc/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fuzzedPosition(position.coords)),
          });
          if (!res.ok) throw new Error();
          // Un 200 peut ne rien avoir enregistré (mode invisible) : le dire,
          // sinon l'invite réapparaît à l'identique et l'utilisatrice conclut
          // que « ça ne marche pas » (#400).
          const message = geolocUpdateMessage(await res.json());
          if (message) {
            setGeoError(message);
            setGeoFallback(geolocFallbackPrompt('invisible'));
            return;
          }
          setGeoFallback(null);
          await fetchPage(true);
        } catch {
          setGeoError('Impossible d\'enregistrer ta position, réessaie plus tard.');
        } finally {
          setGeoRequesting(false);
        }
      },
      (error) => {
        const kind = classifyGeolocError(error);
        setGeoError(geolocFailureMessage(kind));
        setGeoFallback(geolocFallbackPrompt(kind));
        setGeoRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  // Ville choisie depuis l'invite : même écriture que le profil, puis le feed
  // repart avec la distance. L'erreur reste dans le bloc géoloc, comme les autres.
  async function handleCityFallback(city: Parameters<typeof defaultSaveCity>[0]) {
    try {
      await defaultSaveCity(city);
      setGeoError('');
      setGeoFallback(null);
      await fetchPage(true);
    } catch {
      setGeoError('Impossible d’enregistrer ta ville, réessaie plus tard.');
    }
  }

  const geoFallbackBlock = geoFallback && (
    <div className="mt-3 text-left">
      <div className="mb-1.5 flex items-center gap-2.5 text-xs uppercase tracking-wider text-muted before:h-px before:flex-1 before:bg-hairline after:h-px after:flex-1 after:bg-hairline">
        ou
      </div>
      <CityPicker label="Indique ta ville" onSelect={handleCityFallback} hint="" />
    </div>
  );

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
    <SiteShell className="py-6 md:pb-section md:pt-11">
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
        {SEGMENTS.filter(({ key }) => key !== 'crossings' || features.crossings).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={segment === key}
            onClick={() => setSegment(key)}
            className={`min-h-[44px] flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
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

      {/* Filtre posé mais géoloc absente : le feed part complet, on explique
          pourquoi la distance ne mord pas plutôt que de rendre une page vide. */}
      {isFeed && segment !== 'nearby' && nearbyReason === 'geoloc_required' && (
        <div className="mb-4 rounded-xl bg-blush p-3 text-sm text-coral-dark dark:bg-coral/10 dark:text-coral-light">
          <p className="mb-2">
            Active ta géoloc pour filtrer par distance — en attendant, ton feed reste complet.
          </p>
          <Button type="button" size="sm" onClick={handleActivateGeoloc} loading={geoRequesting}>
            Activer ma géolocalisation
          </Button>
          {geoError && (
            <p role="alert" className="mt-2 text-red-600 dark:text-red-400">
              {geoError}
            </p>
          )}
          {geoFallbackBlock}
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
        <div className="animate-fade-in mx-auto max-w-reading rounded-xl border border-coral/20 bg-blush p-6 text-center dark:border-coral/20 dark:bg-coral/5">
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
        <div className="animate-fade-in mx-auto max-w-reading rounded-xl border border-dashed border-coral/40 bg-blush p-6 text-center dark:border-coral/30 dark:bg-coral/5">
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
          {geoFallbackBlock}
        </div>
      ) : nearbyReason === 'empty_feed' ? (
        <div className="animate-fade-in mx-auto max-w-reading rounded-xl border border-hairline bg-surface p-6 text-center">
          <p className="text-muted">
            {filters.distanceKm !== null
              ? `Personne dans un rayon de ${filters.distanceKm} km. Élargis ta distance ou reviens plus tard.`
              : 'Personne à découvrir pour le moment. Reviens plus tard.'}
          </p>
        </div>
      ) : (
        <>
          {/* Dire où on en est du feed : sans ça, une rangée complétée par des
              vignettes d'attente laisserait croire qu'il reste des profils. */}
          {visibleUsers.length === 0 ? (
            <p className="mb-4 text-center text-muted">
              Personne {segment === 'nearby' ? 'à proximité' : 'à découvrir'} pour le moment
            </p>
          ) : !cursor ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
              Tu as tout vu — {visibleUsers.length} personne{visibleUsers.length > 1 ? 's' : ''}
            </p>
          ) : null}

          <div className="grid gap-grid md:grid-cols-2 lg:grid-cols-3">
            {/* Relance de complétion (spec 005) : première cellule de « Pour
                toi », avant les profils — là où la personne regarde. */}
            {segment === 'pourtoi' && nudgeKind && (
              <ProfileNudgeCard
                kind={nudgeKind}
                onDismiss={() => {
                  writeStoredDate(NUDGE_DISMISS_KEY);
                  setNudgeKind(null);
                }}
              />
            )}
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
                distanceBucket={user.distanceBucket}
                photos={user.photos}
                veiledPhotos={user.veiledPhotos}
                interests={user.interests}
                practices={user.practices}
                onLike={() => handleLike(user.userId)}
                onPass={() => handlePass(user.userId)}
                onProfileClick={(id) => setSelectedUserId(id)}
              />
            ))}

            {/* Fin de feed seulement : tant qu'une page reste à charger, une
                « place libre » mentirait sur ce qui vient après. */}
            {!cursor && <GridFillerCards realCount={visibleUsers.length + (segment === 'pourtoi' && nudgeKind ? 1 : 0)} />}
          </div>

          {cursor && (
            // En grille, un bouton pleine largeur barre la page : il se
            // recentre dès que la grille a plus d'une colonne.
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="md:w-auto md:px-8"
                onClick={() => fetchPage(false)}
                loading={loading}
              >
                {loading ? 'Chargement…' : 'Charger plus'}
              </Button>
            </div>
          )}
        </>
      )}
      <ProfileModal
        userId={selectedUserId ?? ''}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        // `passedIds` filtre déjà `visibleUsers` : on réutilise ce canal plutôt
        // que de refetcher tout le feed pour faire disparaître une carte.
        onBlocked={(id) => setPassedIds((prev) => new Set(prev).add(id))}
      />
    </SiteShell>
  );
}
