/**
 * Parcours « Activer ma géolocalisation » côté client (#400).
 *
 * Isolé de la page Découvrir pour être testable sans monter le feed : la copie
 * de chaque échec doit dire la vérité. Un `POSITION_UNAVAILABLE` ou un
 * `TIMEOUT` présenté comme « refusée » envoie vérifier un réglage déjà bon.
 */

import { fuzzLocation } from '@/lib/geoloc';

export type GeolocFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

// Codes de GeolocationPositionError (constantes de la spec, stables).
const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

export function classifyGeolocError(error: { code: number }): GeolocFailure {
  if (error.code === PERMISSION_DENIED) return 'denied';
  if (error.code === TIMEOUT) return 'timeout';
  // POSITION_UNAVAILABLE et tout code inconnu : ne jamais accuser un refus
  // qui n'a pas eu lieu.
  return 'unavailable';
}

const FAILURE_COPY: Record<GeolocFailure, string> = {
  denied:
    "Accès à ta position refusé. Autorise-le dans les réglages de ton navigateur, puis réessaie.",
  unavailable:
    "Ton appareil n'a pas réussi à déterminer ta position (services de localisation coupés, VPN, réseau). Réessaie plus tard, ou depuis ton téléphone.",
  timeout:
    'Ta position met trop de temps à arriver. Réessaie, idéalement avec le Wi-Fi activé.',
  unsupported: "La géolocalisation n'est pas disponible sur cet appareil.",
};

export function geolocFailureMessage(kind: GeolocFailure): string {
  return FAILURE_COPY[kind];
}

export interface GeolocUpdateBody {
  throttled?: boolean;
  invisible?: boolean;
  crossings?: string[];
}

/**
 * Message à afficher après un `POST /api/geoloc/update` en 200, ou `null` si
 * la position est bien prise en compte (enregistrée, ou déjà fraîche : le
 * throttle de 10 min ne joue que sur une position existante).
 */
export function geolocUpdateMessage(body: GeolocUpdateBody): string | null {
  if (body.invisible) {
    return 'Ton mode invisible est activé : ta position n’est pas enregistrée. Désactive-le dans tes paramètres pour voir les célibataires à proximité.';
  }
  return null;
}

/**
 * Charge utile envoyée à `/api/geoloc/update` : jamais la position brute.
 * `GeolocPromiseCard` promet un brouillage sur l'appareil avant envoi ;
 * `fuzzLocation` existait mais n'était appelée nulle part (#401). Rayon 100 m :
 * invisible pour les croisements (500 m) et l'arrondi serveur (~1 km).
 */
export function fuzzedPosition(coords: { latitude: number; longitude: number }): {
  latitude: number;
  longitude: number;
} {
  const { lat, lng } = fuzzLocation(coords.latitude, coords.longitude);
  return { latitude: lat, longitude: lng };
}

/**
 * Repli « ville » sur Découvrir (#406, spec 004) : chaque échec de
 * géolocalisation est suivi d'une proposition de saisir sa ville, au moment
 * exact où le besoin apparaît. En mode invisible, la ville n'aiderait pas
 * (la position n'est pas exploitée) : on ne la propose pas.
 */
export function geolocFallbackPrompt(kind: GeolocFailure | 'invisible'): string | null {
  if (kind === 'invisible') return null;
  return 'Ou indique ta ville';
}
