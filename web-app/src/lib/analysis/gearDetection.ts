import type { Engine } from '@/types/config';

/**
 * Check if an engine is direct-drive (no gearbox)
 */
export function isDirectDrive(engine: Engine): boolean {
  return !engine.gearbox.gears || engine.gearbox.gears.length === 0;
}

/**
 * Detect which gear is engaged based on RPM and speed relationship
 * For direct-drive karts, always returns 1 (single gear)
 *
 * @param rpm - Engine RPM
 * @param speed - Vehicle speed in m/s
 * @param wheelRadius - Wheel radius in meters
 * @param finalRatio - Final drive ratio (rear/front sprocket)
 * @param engine - Engine configuration with gearbox ratios
 * @returns Detected gear number (1-6) or 0 if unable to detect, -1 for direct drive
 */
export function detectGear(
  rpm: number,
  speed: number,
  wheelRadius: number,
  finalRatio: number,
  engine: Engine
): number {
  // Need minimum speed to avoid division issues
  if (speed < 1) return 0;

  // Direct drive karts have no gearbox - always return 1 (single "gear")
  if (isDirectDrive(engine)) {
    return 1; // Represents direct drive
  }

  // Calculate angular velocities
  const wheelAngularVelocity = speed / wheelRadius; // rad/s
  const engineAngularVelocity = (rpm * Math.PI) / 30; // rad/s (convert from RPM)

  // Observed overall ratio from engine to wheel
  const observedRatio = engineAngularVelocity / wheelAngularVelocity;

  // Calculate primary ratio
  const primaryRatio = engine.gearbox.primary.output / engine.gearbox.primary.input;

  // Try to match against each gear
  const gears = engine.gearbox.gears;
  let bestMatch = 0;
  let bestError = 0.15; // 15% maximum tolerance (increased from 10%)

  for (let i = 0; i < gears.length; i++) {
    const gear = gears[i];
    if (!gear.input || !gear.output) continue;

    const gearRatio = gear.output / gear.input;
    const expectedRatio = primaryRatio * gearRatio * finalRatio;

    const error = Math.abs(observedRatio - expectedRatio) / expectedRatio;

    if (error < bestError) {
      bestError = error;
      bestMatch = i + 1; // Gears are 1-indexed
    }
  }

  return bestMatch;
}

/**
 * Calculate expected RPM for a given speed and gear
 * Useful for validating gear detection and creating gear engagement charts
 *
 * @param speed - Vehicle speed in m/s
 * @param gear - Gear number (1-6)
 * @param wheelRadius - Wheel radius in meters
 * @param finalRatio - Final drive ratio
 * @param engine - Engine configuration
 * @returns Expected RPM
 */
export function calculateExpectedRPM(
  speed: number,
  gear: number,
  wheelRadius: number,
  finalRatio: number,
  engine: Engine
): number {
  const totalRatio = getTotalRatio(gear, finalRatio, engine);
  if (totalRatio === 0) return 0;

  const wheelAngularVelocity = speed / wheelRadius;
  const engineAngularVelocity = wheelAngularVelocity * totalRatio;

  // Convert rad/s to RPM
  return (engineAngularVelocity * 30) / Math.PI;
}

/**
 * Get total gear ratio for a specific gear
 * For direct-drive, returns only the final ratio (primary is typically 1:1)
 *
 * @param gear - Gear number (1-6, or 1 for direct drive)
 * @param finalRatio - Final drive ratio
 * @param engine - Engine configuration
 * @returns Total ratio from engine to wheel
 */
export function getTotalRatio(
  gear: number,
  finalRatio: number,
  engine: Engine
): number {
  const primaryRatio = engine.gearbox.primary.output / engine.gearbox.primary.input;

  // Direct drive - only final ratio matters (primary is typically 1:1)
  if (isDirectDrive(engine)) {
    return primaryRatio * finalRatio;
  }

  // Gearbox - need valid gear number
  if (gear < 1 || gear > engine.gearbox.gears.length) return 0;

  const gearData = engine.gearbox.gears[gear - 1];
  const gearRatio = gearData.output / gearData.input;

  return primaryRatio * gearRatio * finalRatio;
}
