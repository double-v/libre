const EARTH_RADIUS_M = 6371000;
const FUZZ_RADIUS_M = 100;

export function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * FUZZ_RADIUS_M;
  const deltaLat = (distance * Math.cos(angle)) / EARTH_RADIUS_M;
  const deltaLng = (distance * Math.sin(angle)) / (EARTH_RADIUS_M * Math.cos(lat * (Math.PI / 180)));

  return {
    lat: lat + (deltaLat * 180) / Math.PI,
    lng: lng + (deltaLng * 180) / Math.PI,
  };
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function roundDistance(distanceM: number): number {
  if (distanceM < 1000) return Math.ceil(distanceM / 50) * 50;
  if (distanceM < 10000) return Math.round(distanceM / 100) * 100;
  return Math.round(distanceM / 500) * 500;
}

export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number,
): boolean {
  return haversineDistance(lat1, lng1, lat2, lng2) <= radiusKm * 1000;
}