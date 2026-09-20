import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import {
  searchCities,
  GeocodingUnavailable,
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  type CityCandidate,
} from '@/lib/geocoding';

/**
 * Propositions de villes pour la saisie manuelle (#405, spec 004).
 * Contrat : specs/004-ville-manuelle/contracts/cities-search.md.
 *
 * Adaptateur mince : session, bornes, rate limit par membre, mapping HTTP.
 * Le géocodage vit dans `src/lib/geocoding.ts`.
 */

const querySchema = z.string().trim().max(MAX_QUERY_LENGTH);

// Ne renvoyer que les cinq champs du contrat, quoi que renvoie l'amont.
function toContract(c: CityCandidate): CityCandidate {
  return { label: c.label, qualifier: c.qualifier, country: c.country, lat: c.lat, lng: c.lng };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = querySchema.safeParse(request.nextUrl.searchParams.get('q') ?? '');
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    const q = parsed.data;
    // Sous le seuil, pas d'appel sortant — et pas de quota consommé : les deux
    // premières frappes d'une saisie ne sont pas une requête.
    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ cities: [] });
    }

    const rl = await rateLimit(`cities:${session.user.id}`, limits.cities.limit, limits.cities.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const cities = (await searchCities(q)).map(toContract);
    return NextResponse.json({ cities });
  } catch (error) {
    if (error instanceof GeocodingUnavailable) {
      return NextResponse.json({ error: 'geocoding_unavailable' }, { status: 503 });
    }
    console.error('Cities search error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
