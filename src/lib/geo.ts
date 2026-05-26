/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  
  // Return distance rounded to 1 decimal place, e.g. 1.2
  return Math.round(d * 10) / 10;
}

/**
 * Sorts stores in ascending order based on their physical distance from the user's latitude and longitude.
 */
export function sortStoresByDistance<T extends { latitude: number; longitude: number }>(
  stores: T[],
  userLat: number,
  userLng: number
): (T & { distance: number })[] {
  return stores
    .map((store) => ({
      ...store,
      distance: calculateDistance(userLat, userLng, store.latitude, store.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);
}
