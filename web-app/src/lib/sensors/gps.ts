/**
 * Geolocation API wrapper for GPS speed and position
 * Uses watchPosition for continuous updates
 */

export interface GPSReading {
  speed: number | null; // m/s (null if unavailable)
  accuracy: number; // meters
  latitude: number;
  longitude: number;
  altitude: number | null; // meters (null if unavailable)
  heading: number | null; // degrees from north (null if unavailable)
  timestamp: number; // ms since epoch
}

export type GPSCallback = (reading: GPSReading) => void;
export type GPSErrorCallback = (error: GeolocationPositionError) => void;

/**
 * Check if Geolocation API is available
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Request geolocation permission
 * This will trigger the browser permission prompt
 * @returns 'granted' | 'denied' | 'prompt'
 */
export async function requestGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isGeolocationSupported()) {
    return 'denied';
  }

  // Check if Permissions API is available
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch {
      // Permissions API not supported for geolocation on this browser
    }
  }

  // Fall back to trying to get position
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve('denied');
        } else {
          // Other errors (position unavailable, timeout) still mean we have permission
          resolve('granted');
        }
      },
      { timeout: 5000 }
    );
  });
}

/**
 * Start watching GPS position
 * @param onReading Callback for each GPS reading
 * @param onError Callback for errors
 * @returns Cleanup function to stop watching
 */
export function startGPS(onReading: GPSCallback, onError?: GPSErrorCallback): () => void {
  if (!isGeolocationSupported()) {
    console.error('Geolocation API not supported');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onReading({
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      console.error('GPS error:', error.message);
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0, // No caching, always fresh
      timeout: 10000,
    }
  );

  // Return cleanup function
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Get a single GPS reading
 * @param timeout Max time to wait (ms)
 * @returns Promise resolving to GPS reading
 */
export function getGPSReading(timeout: number = 10000): Promise<GPSReading> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation API not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(new Error(`GPS error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout,
      }
    );
  });
}

/**
 * Convert speed from m/s to km/h
 */
export function msToKmh(speedMs: number): number {
  return speedMs * 3.6;
}

/**
 * Convert speed from km/h to m/s
 */
export function kmhToMs(speedKmh: number): number {
  return speedKmh / 3.6;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
