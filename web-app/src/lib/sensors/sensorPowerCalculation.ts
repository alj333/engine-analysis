/**
 * Power calculation from sensor data
 * P = F × v where F = m×a + F_drag + F_rolling
 */

import type {
  SensorSample,
  CalibrationData,
  SpeedPowerPoint,
  SensorSessionStatistics,
} from '@/types/sensor';
import { transformAcceleration } from './calibration';
import { savitzkyGolay } from '@/lib/analysis/dataFiltering';

// Physical constants
const AIR_DENSITY = 1.225; // kg/m³ at sea level, 15°C
const GRAVITY = 9.81; // m/s²
const CV_TO_WATTS = 735.5; // 1 CV (metric horsepower) = 735.5 W

// Default vehicle parameters (can be overridden)
const DEFAULT_FRONTAL_AREA = 0.5; // m² (kart + driver)
const DEFAULT_DRAG_COEFFICIENT = 0.8; // Cd for kart
const DEFAULT_ROLLING_COEFFICIENT = 0.02; // Typical for kart tires

// Speed binning parameters
const SPEED_BIN_SIZE_KMH = 5; // km/h per bin
const MIN_SAMPLES_PER_BIN = 3;

export interface PowerCalculationConfig {
  kartWeight: number; // kg (including driver)
  frontalArea?: number; // m²
  dragCoefficient?: number;
  rollingCoefficient?: number;
  filterLevel?: number; // 0-100
}

interface ProcessedSample {
  timestamp: number;
  speedMs: number;
  speedKmh: number;
  forwardAccel: number; // m/s²
  power: number; // W
  powerCV: number; // CV
}

/**
 * Process raw sensor samples into power curve data
 */
export function processSensorData(
  samples: SensorSample[],
  calibration: CalibrationData,
  config: PowerCalculationConfig
): { curve: SpeedPowerPoint[]; statistics: SensorSessionStatistics } {
  const {
    kartWeight,
    frontalArea = DEFAULT_FRONTAL_AREA,
    dragCoefficient = DEFAULT_DRAG_COEFFICIENT,
    rollingCoefficient = DEFAULT_ROLLING_COEFFICIENT,
    filterLevel = 50,
  } = config;

  // Step 1: Process each sample to get power
  const processed = processSamples(samples, calibration, {
    kartWeight,
    frontalArea,
    dragCoefficient,
    rollingCoefficient,
  });

  // Step 2: Bin by speed
  const binned = binBySpeed(processed, SPEED_BIN_SIZE_KMH);

  // Step 3: Apply filtering if needed
  const filtered = applyFiltering(binned, filterLevel);

  // Step 4: Calculate statistics
  const statistics = calculateStatistics(processed, filtered);

  return { curve: filtered, statistics };
}

/**
 * Process individual samples to calculate instantaneous power
 */
function processSamples(
  samples: SensorSample[],
  calibration: CalibrationData,
  params: {
    kartWeight: number;
    frontalArea: number;
    dragCoefficient: number;
    rollingCoefficient: number;
  }
): ProcessedSample[] {
  const { kartWeight, frontalArea, dragCoefficient, rollingCoefficient } = params;

  const processed: ProcessedSample[] = [];

  for (const sample of samples) {
    // Skip samples without GPS speed
    if (sample.gpsSpeed === null || sample.gpsSpeed < 0.5) {
      continue;
    }

    const speedMs = sample.gpsSpeed;
    const speedKmh = speedMs * 3.6;

    // Transform acceleration to kart coordinates
    const accel = transformAcceleration(
      {
        x: sample.accelX,
        y: sample.accelY,
        z: sample.accelZ,
        timestamp: sample.timestamp,
      },
      calibration
    );

    const forwardAccel = accel.forward;

    // Calculate forces
    // F_inertial = m × a (force to accelerate the mass)
    const inertialForce = kartWeight * forwardAccel;

    // F_drag = 0.5 × ρ × A × Cd × v²
    const dragForce = 0.5 * AIR_DENSITY * frontalArea * dragCoefficient * speedMs ** 2;

    // F_rolling = m × g × Cr
    const rollingForce = kartWeight * GRAVITY * rollingCoefficient;

    // Total force at wheel = inertial + drag + rolling
    // When accelerating, engine must overcome drag + rolling AND provide inertial force
    const totalForce = inertialForce + dragForce + rollingForce;

    // Power = Force × velocity
    const power = totalForce * speedMs;
    const powerCV = power / CV_TO_WATTS;

    processed.push({
      timestamp: sample.timestamp,
      speedMs,
      speedKmh,
      forwardAccel,
      power,
      powerCV,
    });
  }

  return processed;
}

/**
 * Bin processed samples by speed
 */
function binBySpeed(
  samples: ProcessedSample[],
  binSizeKmh: number
): SpeedPowerPoint[] {
  const bins = new Map<
    number,
    {
      speedSum: number;
      powerSum: number;
      powerWattsSum: number;
      accelSum: number;
      count: number;
    }
  >();

  for (const sample of samples) {
    // Only include positive power (acceleration)
    // Negative power during braking is less useful for power curves
    if (sample.powerCV < 0) continue;

    const binIndex = Math.floor(sample.speedKmh / binSizeKmh);

    if (!bins.has(binIndex)) {
      bins.set(binIndex, {
        speedSum: 0,
        powerSum: 0,
        powerWattsSum: 0,
        accelSum: 0,
        count: 0,
      });
    }

    const bin = bins.get(binIndex)!;
    bin.speedSum += sample.speedKmh;
    bin.powerSum += sample.powerCV;
    bin.powerWattsSum += sample.power;
    bin.accelSum += sample.forwardAccel;
    bin.count++;
  }

  // Convert to array and filter bins with too few samples
  const result: SpeedPowerPoint[] = [];

  const sortedBins = Array.from(bins.entries()).sort((a, b) => a[0] - b[0]);

  for (const [binIndex, bin] of sortedBins) {
    if (bin.count < MIN_SAMPLES_PER_BIN) continue;

    const binCenter = (binIndex + 0.5) * binSizeKmh;
    result.push({
      speedKmh: binCenter,
      speedMs: binCenter / 3.6,
      avgPower: bin.powerSum / bin.count,
      avgPowerWatts: bin.powerWattsSum / bin.count,
      avgForwardAccel: bin.accelSum / bin.count,
      sampleCount: bin.count,
    });
  }

  return result;
}

/**
 * Apply Savitzky-Golay filtering to smooth the power curve
 */
function applyFiltering(
  curve: SpeedPowerPoint[],
  filterLevel: number
): SpeedPowerPoint[] {
  if (filterLevel <= 0 || curve.length < 5) return curve;

  // Extract power values
  const powers = curve.map((p) => p.avgPower);

  // Apply filtering based on level
  let windowSize: 5 | 7 | 9 = 5;
  if (filterLevel > 50) windowSize = 7;
  if (filterLevel > 75) windowSize = 9;

  const smoothed = savitzkyGolay(powers, windowSize);

  // Apply second pass for heavy filtering
  const finalSmoothed = filterLevel > 80 ? savitzkyGolay(smoothed, 5) : smoothed;

  // Reconstruct curve with smoothed values
  return curve.map((point, i) => ({
    ...point,
    avgPower: Math.max(0, finalSmoothed[i]), // Ensure non-negative
    avgPowerWatts: Math.max(0, finalSmoothed[i] * CV_TO_WATTS),
  }));
}

/**
 * Calculate session statistics
 */
function calculateStatistics(
  processed: ProcessedSample[],
  curve: SpeedPowerPoint[]
): SensorSessionStatistics {
  // Find peak power from curve
  let peakPower = 0;
  let peakPowerSpeed = 0;

  for (const point of curve) {
    if (point.avgPower > peakPower) {
      peakPower = point.avgPower;
      peakPowerSpeed = point.speedKmh;
    }
  }

  // Calculate max speed and accelerations from raw data
  let maxSpeed = 0;
  let maxAcceleration = 0;
  let maxDeceleration = 0;

  for (const sample of processed) {
    if (sample.speedKmh > maxSpeed) maxSpeed = sample.speedKmh;

    const accelG = sample.forwardAccel / GRAVITY;
    if (accelG > maxAcceleration) maxAcceleration = accelG;
    if (accelG < -maxDeceleration) maxDeceleration = -accelG;
  }

  return {
    peakPower,
    peakPowerSpeed,
    maxSpeed,
    maxAcceleration,
    maxDeceleration,
    totalSamples: processed.length,
    validSpeedSamples: processed.filter((s) => s.speedMs > 0.5).length,
  };
}

/**
 * Convert power from CV to kW
 */
export function cvToKw(cv: number): number {
  return (cv * CV_TO_WATTS) / 1000;
}

/**
 * Convert power from kW to CV
 */
export function kwToCv(kw: number): number {
  return (kw * 1000) / CV_TO_WATTS;
}
