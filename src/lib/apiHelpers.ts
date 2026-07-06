/** Shared helpers for API route request parsing and error handling. */

/** Extracts a human-readable message from an unknown thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error;
  return fallback;
}

export interface GeoParams {
  lat: number;
  lng: number;
  dbMode: string;
}

/** Bengaluru city-center coordinates used as the default location. */
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.6400;

/**
 * Parses the `lat`, `lng` and `db_mode` query parameters shared by the
 * location-aware API routes, applying the standard defaults.
 */
export function parseGeoParams(searchParams: URLSearchParams): GeoParams {
  return {
    lat: parseFloat(searchParams.get('lat') || String(DEFAULT_LAT)),
    lng: parseFloat(searchParams.get('lng') || String(DEFAULT_LNG)),
    dbMode: searchParams.get('db_mode') || 'postgres',
  };
}
