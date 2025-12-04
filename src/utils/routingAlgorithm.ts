// src/utils/routingAlgorithm.ts

// Basic location type used across the app
export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface OptimizedRouteResult {
  route: Location[];   // ordered list: start -> stops... -> end
  distance: number;    // total distance in km
  time: number;        // estimated travel time in minutes
}

// Average bus speed in km/h (tweak as needed)
const AVERAGE_SPEED_KMH = 20;

/**
 * Haversine distance between two geo coordinates in kilometers
 */
function haversineDistance(a: Location, b: Location): number {
  const toRad = (v: number) => (v * Math.PI) / 180;

  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
}

/**
 * Simple route optimizer:
 * - Start at `start`
 * - Visit all `stops` using a greedy "nearest next stop" strategy
 * - End at `end`
 *
 * Returns total distance (km) and rough time estimate (minutes).
 *
 * NOTE: This is a heuristic, not perfect Dijkstra/TSP, but
 * good enough for a small campus map.
 */
export function getOptimizedRoute(
  start: Location,
  end: Location,
  stops: Location[] = []
): OptimizedRouteResult {
  // Defensive copy so we don't mutate the caller's array
  const remainingStops = [...stops];
  const route: Location[] = [];

  // Always start from the start point
  let current = start;
  route.push(current);

  // Greedy nearest-neighbor for intermediate stops
  while (remainingStops.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistance(current, remainingStops[0]);

    for (let i = 1; i < remainingStops.length; i++) {
      const d = haversineDistance(current, remainingStops[i]);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = i;
      }
    }

    const nextStop = remainingStops.splice(nearestIndex, 1)[0];
    route.push(nextStop);
    current = nextStop;
  }

  // Finally go to the end point
  if (end && end.id !== current.id) {
    route.push(end);
  }

  // Compute total distance
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += haversineDistance(route[i], route[i + 1]);
  }

  // Estimate time (minutes)
  const timeHours = totalDistance / AVERAGE_SPEED_KMH;
  const timeMinutes = timeHours * 60;

  return {
    route,
    distance: totalDistance,
    time: timeMinutes,
  };
}
