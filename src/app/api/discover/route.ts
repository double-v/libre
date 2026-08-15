import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { haversineDistance } from '@/lib/geoloc';
import { boundingBox, distanceBucket, type DistanceBucket } from '@/lib/discover-distance';
import { canSeePractices } from '@/lib/profile-visibility';
import { rateLimit, limits } from '@/lib/rate-limit';

const PAGE_SIZE = 20;
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const MIN_DISTANCE_KM = 1;
const MAX_DISTANCE_KM = 500;

// Curseur composite pour les feeds triés en mémoire (issues #180, #327).
// Contrairement aux tabs paginés par curseur Prisma sur `userId`, ces feeds
// trient sur une valeur qui n'existe pas en base (distance haversine) ou que le
// curseur Prisma suivrait mal : le curseur encode donc la position dans la
// liste triée — (valeur de tri, userId), le userId départageant les ex æquo
// pour un ordre stable. Base64url pour rester opaque côté client.
function encodeCursor(value: number, userId: string): string {
  return Buffer.from(`${value}|${userId}`).toString('base64url');
}

function decodeCursor(cursor: string): { value: number; userId: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = decoded.indexOf('|');
    if (sep === -1) return null;
    const value = Number(decoded.slice(0, sep));
    const userId = decoded.slice(sep + 1);
    if (!Number.isFinite(value) || !userId) return null;
    return { value, userId };
  } catch {
    return null;
  }
}

type ProfileWithUser = {
  userId: string;
  bio: string;
  birthDate: Date | null;
  genderIdentity: string;
  orientation: string[];
  interests: string[];
  practices: string[];
  practicesVisibility: string;
  photos: string[];
  lastKnownLat: number;
  lastKnownLng: number;
  user: { id: string; displayName: string; isVerified: boolean; lastActive: Date };
};

interface FeedUser {
  userId: string;
  displayName: string;
  bio: string;
  birthDate: Date | null;
  genderIdentity: string;
  orientation: string[];
  interests: string[];
  practices?: string[];
  photos: string[];
  isVerified: boolean;
  lastActive: Date;
  distanceKm?: number;
  distanceBucket?: DistanceBucket;
  online: boolean;
  age: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`discover:${session.user.id}`, limits.discover.limit, limits.discover.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const userId = session.user.id;
    const { searchParams } = request.nextUrl;
    const tab = searchParams.get('tab') || 'all';
    const cursor = searchParams.get('cursor') || undefined;
    const genderFilter = searchParams.get('gender')?.split(',').filter(Boolean) || [];
    const orientationFilter = searchParams.get('orientation')?.split(',').filter(Boolean) || [];
    const ageMinFilter = parseInt(searchParams.get('ageMin') || '18', 10);
    const ageMaxFilter = parseInt(searchParams.get('ageMax') || '99', 10);
    const interestsFilter = searchParams.get('interests')?.split(',').filter(Boolean) || [];

    // Filtre de distance (#327). Paramètre absent = « partout » : on ne retombe
    // pas sur la valeur persistée, parce que « aucun filtre » est un état
    // légitime que le client doit pouvoir exprimer.
    const rawDistance = searchParams.get('distance');
    const parsedDistance = rawDistance !== null ? Number(rawDistance) : NaN;
    const distanceFilterKm = Number.isFinite(parsedDistance)
      ? Math.min(MAX_DISTANCE_KM, Math.max(MIN_DISTANCE_KM, Math.round(parsedDistance)))
      : null;

    // Push filters into the Prisma where clause (issue #147 — previously these
    // were applied client-side after fetch, which broke pagination: the DB
    // returned PAGE_SIZE+1 rows, the JS filter eliminated most, and the user
    // got a sparse feed instead of a full page).
    const now = Date.now();
    const ageMaxBirthDate = new Date(now - ageMaxFilter * 365.25 * 24 * 60 * 60 * 1000);
    const ageMinBirthDate = new Date(now - ageMinFilter * 365.25 * 24 * 60 * 60 * 1000);

    const filterWhere = {
      ...(genderFilter.length > 0 ? { genderIdentity: { in: genderFilter } } : {}),
      ...(orientationFilter.length > 0 ? { orientation: { hasSome: orientationFilter } } : {}),
      ...(interestsFilter.length > 0 ? { interests: { hasSome: interestsFilter } } : {}),
      ...(ageMinFilter > 18 || ageMaxFilter < 99
        ? { birthDate: { gte: ageMaxBirthDate, lte: ageMinBirthDate } }
        : {}),
    };

    // Get current user's profile for nearby tab
    const myProfile = await getDb().profile.findUnique({ where: { userId } });
    const hasGeoloc = !!myProfile && !(myProfile.lastKnownLat === 0 && myProfile.lastKnownLng === 0);

    // Get blocked user IDs
    const blocks = await getDb().block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }

    // Get already-liked user IDs
    const likes = await getDb().like.findMany({
      where: { likerId: userId },
      select: { likedId: true },
    });
    const likedIds = new Set(likes.map((l) => l.likedId));

    // Matches du lecteur : seule clé qui ouvre les champs réservés (#328).
    // Un match implique un like, donc ces profils sont en pratique déjà hors
    // du feed — la règle est appliquée quand même, pour ne pas dépendre d'une
    // exclusion qui pourrait changer.
    const matches = await getDb().match.findMany({
      where: { OR: [{ userA: userId }, { userB: userId }] },
      select: { userA: true, userB: true },
    });
    const matchedIds = new Set(matches.map((m) => (m.userA === userId ? m.userB : m.userA)));

    const excludeIds = [...blockedIds, ...likedIds];

    // Build base where clause: exclude self, banned, invisible, blocked, already-liked
    // + push DB-side filters (issue #147: gender, orientation, age, interests
    // are now in the Prisma where clause, not filtered client-side).
    const baseWhere = {
      user: {
        id: { not: userId },
        isBanned: false,
      },
      invisibleMode: false,
      userId: { notIn: excludeIds },
      ...filterWhere,
    };

    // Préfiltre géographique poussé dans SQL : la bounding box borne ce que la
    // base remonte, la haversine exacte affine ensuite en mémoire (cf.
    // `discover-distance`). Sans elle, filtrer par distance obligerait à
    // charger tous les profils géolocalisés à chaque page.
    const geoWhere = (km: number) => {
      const box = boundingBox(myProfile!.lastKnownLat, myProfile!.lastKnownLng, km);
      return {
        lastKnownLat: { not: 0, gte: box.latMin, lte: box.latMax },
        lastKnownLng: { not: 0, gte: box.lngMin, lte: box.lngMax },
      };
    };

    const profileInclude = {
      user: { select: { id: true, displayName: true, isVerified: true, lastActive: true } },
    } as const;

    const onlineThreshold = new Date(now - ONLINE_THRESHOLD_MS);

    /** Distance exacte en km entre le viewer et un profil — null si l'un des
     *  deux n'a pas de géoloc, auquel cas on n'affiche rien plutôt qu'un zéro
     *  trompeur. */
    const distanceKmTo = (p: ProfileWithUser): number | null => {
      if (!hasGeoloc || (p.lastKnownLat === 0 && p.lastKnownLng === 0)) return null;
      return haversineDistance(
        myProfile!.lastKnownLat, myProfile!.lastKnownLng,
        p.lastKnownLat, p.lastKnownLng,
      ) / 1000;
    };

    /**
     * Sérialisation d'un profil pour le feed.
     *
     * `exactDistanceKm` n'est passé que par le segment « À proximité », où
     * l'utilisateur a explicitement demandé de la géo. Partout ailleurs, seule
     * une tranche large sort de l'API (#327) : c'est le serveur qui arrondit,
     * pas l'affichage — un kilométrage précis dans le JSON resterait lisible
     * dans l'onglet réseau et rendrait la garde anti-trilatération décorative.
     */
    const toFeedUser = (p: ProfileWithUser, exactDistanceKm?: number): FeedUser => {
      const km = exactDistanceKm ?? distanceKmTo(p);
      return {
        userId: p.userId,
        displayName: p.user.displayName,
        bio: p.bio,
        birthDate: p.birthDate,
        genderIdentity: p.genderIdentity,
        orientation: p.orientation,
        interests: p.interests,
        // Pratiques : réservées aux matches par défaut (#328). Clé omise, pas
        // tableau vide — « tu n'y as pas accès » et « cette personne n'en a
        // renseigné aucune » ne sont pas la même information.
        ...(canSeePractices({
          visibility: p.practicesVisibility,
          isSelf: false,
          isMatched: matchedIds.has(p.userId),
        })
          ? { practices: p.practices }
          : {}),
        photos: p.photos,
        isVerified: p.user.isVerified,
        lastActive: p.user.lastActive,
        online: p.user.lastActive >= onlineThreshold,
        ...(exactDistanceKm !== undefined
          ? { distanceKm: exactDistanceKm < 1 ? 1 : Math.round(exactDistanceKm) }
          : km !== null
            ? { distanceBucket: distanceBucket(km) }
            : {}),
        age: p.birthDate
          ? Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      };
    };

    let profiles: FeedUser[] = [];

    // Pagination des feeds triés en mémoire (« À proximité », et « Pour toi »
    // filtré par distance) : quand elle est renseignée (non-null), elle prime
    // sur la pagination générique par curseur userId.
    let inMemoryPagination: { nextCursor: string | null } | null = null;

    /**
     * Découpe une liste déjà triée avec le curseur composite (#180) : ne garde
     * que ce qui vient strictement APRÈS la position encodée, puis coupe à
     * PAGE_SIZE. Curseur absent/illisible → page 1 (dégradation douce).
     */
    function paginateSorted<T extends { sortValue: number; userId: string }>(
      sorted: T[],
      direction: 'asc' | 'desc',
    ): { items: T[]; nextCursor: string | null } {
      const decoded = cursor ? decodeCursor(cursor) : null;
      const after = decoded
        ? sorted.filter((item) =>
            direction === 'asc'
              ? item.sortValue > decoded.value ||
                (item.sortValue === decoded.value && item.userId > decoded.userId)
              : item.sortValue < decoded.value ||
                (item.sortValue === decoded.value && item.userId > decoded.userId),
          )
        : sorted;

      // On lit PAGE_SIZE+1 pour savoir s'il reste une page suivante.
      const pagePlus = after.slice(0, PAGE_SIZE + 1);
      const items = pagePlus.slice(0, PAGE_SIZE);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: pagePlus.length > PAGE_SIZE && last
          ? encodeCursor(last.sortValue, last.userId)
          : null,
      };
    }

    if (tab === 'online') {
      const dbProfiles = await getDb().profile.findMany({
        where: {
          ...baseWhere,
          user: { ...baseWhere.user, lastActive: { gte: onlineThreshold } },
        },
        include: profileInclude,
        take: PAGE_SIZE + 1,
        ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
        orderBy: { user: { lastActive: 'desc' } },
      });

      profiles = dbProfiles.map((p) => toFeedUser(p));
    } else if (tab === 'nearby') {
      if (!myProfile || !hasGeoloc) {
        return NextResponse.json({ users: [], nextCursor: null, reason: 'geoloc_required' });
      }
      // Un seul contrôle de distance dans l'app : pas de filtre = « partout »,
      // ici aussi. Le segment trie par distance croissante, donc « partout » ne
      // noie personne — les plus proches restent en tête. Les comptes qui
      // avaient réglé un rayon serré le retrouvent : la migration a recopié
      // `maxDistanceKm` dans `searchDistanceKm` quand il n'était pas au défaut.
      const maxDist = distanceFilterKm ?? MAX_DISTANCE_KM;
      const candidates = await getDb().profile.findMany({
        where: { ...baseWhere, ...geoWhere(maxDist) },
        include: profileInclude,
      });

      const withDistance = candidates
        .map((p) => ({ profile: p, distanceKm: distanceKmTo(p) ?? Infinity }))
        .filter(({ distanceKm }) => distanceKm <= maxDist)
        // Tri stable : distance croissante puis userId, pour que le curseur
        // (distance, userId) découpe la liste sans doublon ni trou (issue #180).
        .sort((a, b) =>
          a.distanceKm - b.distanceKm ||
          (a.profile.userId < b.profile.userId ? -1 : a.profile.userId > b.profile.userId ? 1 : 0),
        )
        .map((item) => ({ ...item, sortValue: item.distanceKm, userId: item.profile.userId }));

      const page = paginateSorted(withDistance, 'asc');
      inMemoryPagination = { nextCursor: page.nextCursor };
      profiles = page.items.map(({ profile: p, distanceKm }) => toFeedUser(p, distanceKm));
    } else if (distanceFilterKm !== null && hasGeoloc) {
      // tab === 'all', filtré par distance (#327).
      //
      // On quitte la pagination par curseur Prisma : la distance n'existe pas
      // en base, elle se calcule. On charge donc les candidats de la bbox, on
      // affine, on trie par activité récente (l'ordre du feed « Pour toi ») et
      // on pagine avec le curseur composite (lastActive, userId). La bbox borne
      // le volume chargé ; un filtrage post-fetch, lui, rendrait des pages
      // creuses (#147).
      const candidates = await getDb().profile.findMany({
        where: { ...baseWhere, ...geoWhere(distanceFilterKm) },
        include: profileInclude,
      });

      const withDistance = candidates
        .map((p) => ({ profile: p, distanceKm: distanceKmTo(p) ?? Infinity }))
        .filter(({ distanceKm }) => distanceKm <= distanceFilterKm)
        .sort((a, b) =>
          b.profile.user.lastActive.getTime() - a.profile.user.lastActive.getTime() ||
          (a.profile.userId < b.profile.userId ? -1 : a.profile.userId > b.profile.userId ? 1 : 0),
        )
        .map((item) => ({
          ...item,
          sortValue: item.profile.user.lastActive.getTime(),
          userId: item.profile.userId,
        }));

      const page = paginateSorted(withDistance, 'desc');
      inMemoryPagination = { nextCursor: page.nextCursor };
      profiles = page.items.map(({ profile: p }) => toFeedUser(p));
    } else {
      // tab === 'all', sans filtre de distance : chemin historique, pagination
      // par curseur Prisma.
      const dbProfiles = await getDb().profile.findMany({
        where: baseWhere,
        include: profileInclude,
        take: PAGE_SIZE + 1,
        ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
        orderBy: { user: { lastActive: 'desc' } },
      });

      profiles = dbProfiles.map((p) => toFeedUser(p));
    }

    // Pagination: we fetched PAGE_SIZE+1, if we have more than PAGE_SIZE there's a next page
    // (issue #147: filters are now in the DB query, so profiles is already filtered).
    // Pour les feeds triés en mémoire (#180, #327), le découpage est déjà fait
    // dans la branche : on prend leur curseur composite.
    const users = profiles.slice(0, PAGE_SIZE);
    const nextCursor = inMemoryPagination
      ? inMemoryPagination.nextCursor
      : profiles.length > PAGE_SIZE && users.length > 0
        ? users[users.length - 1].userId
        : null;

    // issue #137: distinguish "geoloc active but nobody nearby" from other empty tabs,
    // so the frontend doesn't show a generic empty state when geoloc is the real blocker.
    // #327 étend la distinction au feed « Pour toi » : vidé par le filtre de
    // distance, ou filtre posé sans géoloc — auquel cas le filtre ne peut pas
    // s'appliquer et le feed part sans lui, ce que l'UI doit pouvoir dire.
    if (tab === 'nearby' && users.length === 0) {
      return NextResponse.json({ users, nextCursor, reason: 'empty_feed' });
    }
    if (tab !== 'nearby' && distanceFilterKm !== null && !hasGeoloc) {
      return NextResponse.json({ users, nextCursor, reason: 'geoloc_required' });
    }
    if (tab !== 'nearby' && distanceFilterKm !== null && users.length === 0) {
      return NextResponse.json({ users, nextCursor, reason: 'empty_feed' });
    }

    return NextResponse.json({ users, nextCursor });
  } catch (error) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
