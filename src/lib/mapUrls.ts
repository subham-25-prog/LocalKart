/**
 * Helpers for building Google Maps URLs from a store's exact coordinates.
 *
 * The embed URL uses Google Maps' keyless `output=embed` endpoint so a real
 * Google map with a pin at the exact location renders without requiring a
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be configured.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Rounds a coordinate to 6 decimals (~0.11m precision) and stringifies it. */
function coord(value: number): string {
  return (Math.round(value * 1e6) / 1e6).toString();
}

/**
 * Embeddable Google Maps URL centered on the coordinates with a marker.
 * Suitable for an <iframe src=...>; works without an API key.
 */
export function buildGoogleEmbedUrl({ latitude, longitude }: LatLng, zoom = 16): string {
  const z = Math.min(21, Math.max(1, Math.round(zoom)));
  return `https://maps.google.com/maps?q=${coord(latitude)},${coord(longitude)}&z=${z}&output=embed`;
}

/** Deep link that opens the location (with a pin) in the Google Maps app or web. */
export function buildGoogleSearchUrl({ latitude, longitude }: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${coord(latitude)},${coord(longitude)}`;
}

/** Deep link that starts turn-by-turn directions to the coordinates. */
export function buildGoogleDirectionsUrl({ latitude, longitude }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coord(latitude)},${coord(longitude)}`;
}
