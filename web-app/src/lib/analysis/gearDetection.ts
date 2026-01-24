import type { Engine } from '@/types/config';

/**
 * Detect which gear is engaged based on RPM and speed relationship
 *
 * @param rpm - Engine RPM
 * @param speed - Vehicle speed in m/s
 * @param wheelRadius - Wheel radius in meters
 * @param finalRatio - Final drive ratio (rear/front sprocket)
 * @param engine - Engine configuration with gearbox ratios
 * @returns Detected gear number (1-6) or 0 if unable to detect
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
  let bestError = 0.10; // 10% maximum tolerance

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
  if (gear < 1 || gear > engine.gearbox.gears.length) return 0;

  const primaryRatio = engine.gearbox.primary.output / engine.gearbox.primary.input;
  const gearData = engine.gearbox.gears[gear - 1];
  const gearRatio = gearData.output / gearData.input;

  const totalRatio = primaryRatio * gearRatio * finalRatio;
  const wheelAngularVelocity = speed / wheelRadius;
  const engineAngularVelocity = wheelAngularVelocity * totalRatio;

  // Convert rad/s to RPM
  return (engineAngularVelocity * 30) / Math.PI;
}

/**
 * Get total gear ratio for a specific gear
 * @param gear - Gear number (1-6)
 * @param finalRatio - Final drive ratio
 * @param engine - Engine configuration
 * @returns Total ratio from engine to wheel
 */
export function getTotalRatio(
  gear: number,
  finalRatio: number,
  engine: Engine
): number {
  if (gear < 1 || gear > engine.gearbox.gears.length) return 0;

  const primaryRatio = engine.gearbox.primary.output / engine.gearbox.primary.input;
  const gearData = engine.gearbox.gears[gear - 1];
  const gearRatio = gearData.output / gearData.input;

  return primaryRatio * gearRatio * finalRatio;
}
