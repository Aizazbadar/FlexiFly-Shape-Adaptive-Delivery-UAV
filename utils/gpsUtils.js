// GPS and Terrain Utilities

// Convert pixel position to GPS coordinates
export function pixelToGPS(pixelX, pixelY, baseGPS, scale = 0.0001) {
  // Scale: approximately 0.0001 degrees = 11.1 meters
  const lat = baseGPS.lat + (90 - pixelY) * scale;
  const lon = baseGPS.lon + (pixelX - 50) * scale;
  return { lat, lon };
}

// Convert GPS coordinates to pixel position
export function gpsToPixel(gps, baseGPS, scale = 0.0001) {
  const pixelX = 50 + (gps.lon - baseGPS.lon) / scale;
  const pixelY = 90 - (gps.lat - baseGPS.lat) / scale;
  return { x: pixelX, y: pixelY };
}

// Calculate distance between two GPS coordinates (Haversine formula)
export function calculateGPSDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lon - coord1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Calculate bearing between two GPS coordinates
export function calculateBearing(coord1, coord2) {
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δλ = (coord2.lon - coord1.lon) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
}

// Move GPS coordinate by distance and bearing
export function moveGPSCoordinate(coord, distanceMeters, bearingDegrees) {
  const R = 6371e3; // Earth's radius in meters
  const δ = distanceMeters / R; // Angular distance
  const θ = bearingDegrees * Math.PI / 180; // Bearing in radians

  const φ1 = coord.lat * Math.PI / 180;
  const λ1 = coord.lon * Math.PI / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: φ2 * 180 / Math.PI,
    lon: λ2 * 180 / Math.PI
  };
}

// Simulate terrain elevation (using simplified algorithm)
// In production, you'd use an API like OpenElevation or Mapbox
export function getTerrainElevation(gps) {
  // Simulate with Perlin-like noise for demonstration
  const x = gps.lat * 1000;
  const y = gps.lon * 1000;
  
  // Simple multi-octave noise simulation
  let elevation = 0;
  elevation += Math.sin(x * 0.1) * Math.cos(y * 0.1) * 50;
  elevation += Math.sin(x * 0.3) * Math.cos(y * 0.3) * 20;
  elevation += Math.sin(x * 0.7) * Math.cos(y * 0.7) * 10;
  
  return Math.max(0, elevation + 100); // Base elevation + variation
}

// Get real elevation using Open-Elevation API (free, no API key needed)
export async function getRealTerrainElevation(gps) {
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${gps.lat},${gps.lon}`
    );
    const data = await response.json();
    return data.results[0].elevation;
  } catch (error) {
    console.warn('Failed to fetch real elevation, using simulated:', error);
    return getTerrainElevation(gps);
  }
}

// Add GPS noise/drift for realism
export function addGPSNoise(gps, accuracy = 1.5) {
  return {
    lat: gps.lat + (Math.random() - 0.5) * accuracy * 0.00001,
    lon: gps.lon + (Math.random() - 0.5) * accuracy * 0.00001
  };
}

// Check if coordinates are within bounds
export function isWithinBounds(gps, bounds) {
  return gps.lat >= bounds.minLat && gps.lat <= bounds.maxLat &&
         gps.lon >= bounds.minLon && gps.lon <= bounds.maxLon;
}

// Popular starting locations
export const PRESET_LOCATIONS = {
  sanFrancisco: { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
  newYork: { lat: 40.7128, lon: -74.0060, name: 'New York, NY' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London, UK' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
  dubai: { lat: 25.2048, lon: 55.2708, name: 'Dubai, UAE' },
  sydney: { lat: -33.8688, lon: 151.2093, name: 'Sydney, Australia' },
  custom: { lat: 37.7749, lon: -122.4194, name: 'Custom Location' }
};

// Get user's current location using browser Geolocation API
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}
