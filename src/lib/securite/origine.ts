import { NextResponse } from 'next/server';

/**
 * Contrôle d'origine des écritures admin (spec 012, FR-S08, menace M9).
 *
 * Le cookie de session part avec toute requête que le navigateur d'un
 * modérateur envoie vers le site, y compris celles qu'un site tiers lui fait
 * envoyer. Deux exigences ferment cette porte : un `Content-Type` JSON (un
 * formulaire HTML ou un `sendBeacon` texte ne peuvent pas le poser sans
 * déclencher un contrôle CORS que le site ne répond jamais), et un en-tête
 * `Origin` égal à l'origine du site, comparé exactement, jamais par préfixe.
 *
 * L'origine du site est celle de l'adresse reçue ; `NEXTAUTH_URL` s'y ajoute
 * quand le serveur se voit sous un nom interne (proxy, conteneur).
 *
 * À appeler **après** la garde admin : un non-admin reçoit 404, comme partout
 * sous `/api/admin`, et n'apprend rien de ce contrôle.
 */
export function refusOrigine(request: Request): NextResponse | null {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    return NextResponse.json({ error: 'Requête refusée : le contenu doit être envoyé en JSON.' }, { status: 403 });
  }
  const origine = request.headers.get('origin');
  if (!origine || !originesDuSite(request).has(origine)) {
    return NextResponse.json({ error: 'Requête refusée : son origine n’est pas celle du site.' }, { status: 403 });
  }
  return null;
}

function originesDuSite(request: Request): Set<string> {
  const origines = new Set<string>([new URL(request.url).origin]);
  const publique = process.env.NEXTAUTH_URL;
  if (publique) {
    try {
      origines.add(new URL(publique).origin);
    } catch {
      // Adresse mal formée : on s'en tient à l'origine reçue.
    }
  }
  return origines;
}
