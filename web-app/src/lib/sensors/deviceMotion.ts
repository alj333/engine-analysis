/**
 * DeviceMotion API wrapper for accelerometer access
 * Handles iOS permission requests and normalizes accelerometer data
 */

export interface AccelerometerReading {
  x: number; // m/s² (device X axis)
  y: number; // m/s² (device Y axis)
  z: number; // m/s² (device Z axis)
  timestamp: number; // ms since epoch
}

export type AccelerometerCallback = (reading: AccelerometerReading) => void;

/**
 * Check if DeviceMotion API is available
 */
export function isDeviceMotionSupported(): boolean {
  return 'DeviceMotionEvent' in window;
}

/**
 * Check if iOS permission request is required
 * iOS 13+ requires explicit permission request
 */
export function requiresPermissionRequest(): boolean {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === 'function'
  );
}

/**
 * Request permission for DeviceMotion on iOS
 * Must be called from a user gesture (click/tap)
 * @returns 'granted' | 'denied'
 */
export async function requestMotionPermission(): Promise<'granted' | 'denied'> {
  if (!requiresPermissionRequest()) {
    // Non-iOS or older iOS - permission not required
    return 'granted';
  }

  try {
    const DeviceMotionEventWithPermission = DeviceMotionEvent as unknown as {
      requestPermission: () => Promise<string>;
    };
    const permission = await DeviceMotionEventWithPermission.requestPermission();
    return permission === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('Failed to request motion permission:', error);
    return 'denied';
  }
}

/**
 * Start listening to accelerometer data
 * @param callback Function called with each accelerometer reading
 * @returns Cleanup function to stop listening
 */
export function startAccelerometer(callback: AccelerometerCallback): () => void {
  if (!isDeviceMotionSupported()) {
    console.error('DeviceMotion API not supported');
    return () => {};
  }

  const handleMotion = (event: DeviceMotionEvent) => {
    // accelerationIncludingGravity includes the gravity component
    // This is what we want for calibration and power calculation
    const accel = event.accelerationIncludingGravity;

    if (accel && accel.x !== null && accel.y !== null && accel.z !== null) {
      callback({
        x: accel.x,
        y: accel.y,
        z: accel.z,
        timestamp: Date.now(),
      });
    }
  };

  // Add listener
  window.addEventListener('devicemotion', handleMotion);

  // Return cleanup function
  return () => {
    window.removeEventListener('devicemotion', handleMotion);
  };
}

/**
 * Get a single accelerometer reading (for testing)
 * @param timeout Max time to wait for reading (ms)
 * @returns Promise resolving to accelerometer reading
 */
export function getAccelerometerReading(timeout: number = 1000): Promise<AccelerometerReading> {
  return new Promise((resolve, reject) => {
    if (!isDeviceMotionSupported()) {
      reject(new Error('DeviceMotion API not supported'));
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for accelerometer reading'));
    }, timeout);

    const cleanup = startAccelerometer((reading) => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(reading);
    });
  });
}

/**
 * Calculate the magnitude of acceleration vector
 */
export function accelerationMagnitude(reading: AccelerometerReading): number {
  return Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);
}
