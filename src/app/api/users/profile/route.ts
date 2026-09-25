import { NextResponse } from 'next/server';
import { nextStep } from '@/lib/onboarding';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validators';
import { photoSensitivityMap } from '@/lib/photo-veil';
import { formatCityLabel } from '@/lib/geocoding';
import { detecterContact } from '@/lib/fraude/contact';
import { enregistrerSignal } from '@/lib/fraude/signaux';
import { MESSAGE_CONTACT } from '@/lib/fraude/messages';
import { aConsentementSensible, donnerConsentementSensible, porteDonneeSensible, traceConsentement } from '@/lib/consentement-sensible';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { displayName: true, isVerified: true, mustRenameDisplayName: true, profile: true },
    });

    if (!user) {
      return NextResponse.json({ profile: null, displayName: '', isVerified: false }, { status: 200 });
    }

    // Classification de ses propres photos (#330) : le propriétaire les voit
    // toujours nettes, mais doit savoir lesquelles arrivent floutées aux autres
    // — sans ça la classification serait une sanction invisible.
    const [photoSensitivity, sensitiveConsent] = await Promise.all([
      photoSensitivityMap(user.profile?.photos ?? []),
      // Le client sait s'il doit demander la case art. 9 avant la première
      // saisie d'orientation, de genre ou de pratiques (#425).
      aConsentementSensible(session.user.id),
    ]);

    return NextResponse.json(
      {
        profile: user.profile,
        displayName: user.displayName,
        isVerified: user.isVerified,
        // Pseudo retiré par la règle (#459) : Découvrir envoie vers /pseudo.
        mustRenameDisplayName: user.mustRenameDisplayName,
        photoSensitivity,
        sensitiveConsent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Contact externe dans la bio (spec 006, FR-020) : un moyen de contact
    // utilisable refuse l'écriture — c'est le premier geste des faux profils
    // pour sortir de l'app avant tout match. On montre le passage pour que la
    // personne honnête corrige sans chercher. Un indice faible passe, noté.
    if (data.bio) {
      const contacts = detecterContact(data.bio);
      const fort = contacts.find((c) => c.force === 'fort');
      const repere = fort ?? contacts[0];
      if (repere) {
        await enregistrerSignal({ userId: session.user.id, type: 'contact_bio', force: repere.force, extrait: repere.extrait });
      }
      if (fort) {
        return NextResponse.json({ error: MESSAGE_CONTACT, extrait: fort.extrait }, { status: 400 });
      }
    }

    // Art. 9 (#425) : aucune valeur d'orientation, de genre ou de pratiques ne
    // se persiste sans consentement explicite actif — donné avant, ou dans
    // cette requête même. Vider un champ ne demande rien.
    if (porteDonneeSensible(data)) {
      const consenti = data.sensitiveConsent
        ? await donnerConsentementSensible(session.user.id, traceConsentement(request))
        : await aConsentementSensible(session.user.id);
      if (!consenti) {
        return NextResponse.json({ error: 'consent_required' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    const createData: Record<string, unknown> = { userId: session.user.id };

    if (data.bio !== undefined) { updateData.bio = data.bio; createData.bio = data.bio; }
    if (data.birthDate !== undefined) { updateData.birthDate = new Date(data.birthDate); createData.birthDate = new Date(data.birthDate); }
    if (data.genderIdentity !== undefined) { updateData.genderIdentity = data.genderIdentity; createData.genderIdentity = data.genderIdentity; }
    if (data.orientation !== undefined) { updateData.orientation = data.orientation; createData.orientation = data.orientation; }
    if (data.relationshipType !== undefined) { updateData.relationshipType = data.relationshipType; createData.relationshipType = data.relationshipType; }
    if (data.interests !== undefined) { updateData.interests = data.interests; createData.interests = data.interests; }
    if (data.practices !== undefined) { updateData.practices = data.practices; createData.practices = data.practices; }
    if (data.practicesVisibility !== undefined) { updateData.practicesVisibility = data.practicesVisibility; createData.practicesVisibility = data.practicesVisibility; }
    if (data.photoSensitivityOptIn !== undefined) { updateData.photoSensitivityOptIn = data.photoSensitivityOptIn; createData.photoSensitivityOptIn = data.photoSensitivityOptIn; }
    if (data.socialLinks !== undefined) { updateData.socialLinks = data.socialLinks; createData.socialLinks = data.socialLinks; }
    if (data.photos !== undefined) { updateData.photos = data.photos; createData.photos = data.photos; }
    if (data.invisibleMode !== undefined) { updateData.invisibleMode = data.invisibleMode; createData.invisibleMode = data.invisibleMode; }
    if (data.maxDistanceKm !== undefined) { updateData.maxDistanceKm = data.maxDistanceKm; createData.maxDistanceKm = data.maxDistanceKm; }
    if (data.ageMin !== undefined) { updateData.ageMin = data.ageMin; createData.ageMin = data.ageMin; }
    if (data.ageMax !== undefined) { updateData.ageMax = data.ageMax; createData.ageMax = data.ageMax; }
    if (data.searchGenders !== undefined) { updateData.searchGenders = data.searchGenders; createData.searchGenders = data.searchGenders; }
    if (data.searchOrientations !== undefined) { updateData.searchOrientations = data.searchOrientations; createData.searchOrientations = data.searchOrientations; }
    if (data.searchInterests !== undefined) { updateData.searchInterests = data.searchInterests; createData.searchInterests = data.searchInterests; }
    if (data.searchRelationshipTypes !== undefined) { updateData.searchRelationshipTypes = data.searchRelationshipTypes; createData.searchRelationshipTypes = data.searchRelationshipTypes; }
    // Parcours d'accueil (spec 005) : l'avancement ne recule jamais — deux
    // onglets ouverts, ou une requête en retard, ne doivent pas ramener la
    // personne à une étape qu'elle a déjà passée. Une lecture de plus, mais
    // seulement sur les écritures du parcours.
    if (data.onboardingStep !== undefined) {
      const current = await getDb().profile.findUnique({
        where: { userId: session.user.id },
        select: { onboardingStep: true },
      });
      const step = nextStep(current?.onboardingStep ?? 0, data.onboardingStep);
      updateData.onboardingStep = step;
      createData.onboardingStep = step;
    }
    // `null` porte du sens ici (« partout ») : seul `undefined` veut dire
    // « champ non fourni, n'y touche pas » (#327).
    if (data.searchDistanceKm !== undefined) { updateData.searchDistanceKm = data.searchDistanceKm; createData.searchDistanceKm = data.searchDistanceKm; }

    // Ville saisie à la main (#405) : même position que la géoloc automatique
    // (arrondi 2 décimales, cf. /api/geoloc/update), plus la source et le
    // libellé privés. Pas de throttle ni de brouillage : ce n'est pas un
    // appareil bavard mais un choix explicite. `null` retire tout.
    if (data.city !== undefined) {
      const position = data.city
        ? {
            lastKnownLat: Math.round(data.city.lat * 100) / 100,
            lastKnownLng: Math.round(data.city.lng * 100) / 100,
            lastGeolocAt: new Date(),
            positionSource: 'city',
            cityLabel: formatCityLabel(data.city),
          }
        : { lastKnownLat: 0, lastKnownLng: 0, lastGeolocAt: null, positionSource: null, cityLabel: null };
      Object.assign(updateData, position);
      Object.assign(createData, position);
    }

    const profile = await getDb().profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: createData as never,
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}