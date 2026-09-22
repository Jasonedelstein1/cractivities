export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Coastal-road reality: 30 km/h average. Straight-line distance is padded 30% for road wiggle. */
export const AVG_SPEED_KMH = 30;
const ROAD_FACTOR = 1.3;

export function driveMinutes(km: number): number {
  return Math.max(1, Math.round((km * ROAD_FACTOR) / AVG_SPEED_KMH * 60));
}

export function formatKm(km: number): string {
  if (km < 0.1) return 'here';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** "2.1 km · ~5 min drive" */
export function formatDistance(km: number): string {
  if (km < 0.1) return 'right here';
  const walkable = km <= 1.2;
  const mins = walkable ? Math.round((km / 4.5) * 60) : driveMinutes(km);
  return `${formatKm(km)} · ~${mins} min ${walkable ? 'walk' : 'drive'}`;
}

export function googleDirectionsUrl(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** wa.me needs digits only. */
export function whatsappUrl(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}`;
}

export function telUrl(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}
