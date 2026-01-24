import type { TelemetryData, LapInfo } from '@/types/telemetry';
import type { Kart, Engine, Tyre, FinalDrive, RunConditions } from '@/types/config';
import type { PowerDataPoint, LapTelemetryResult, AnalysisResults } from '@/types/results';
import { calculateAirDensity } from './environmentCorrection';
import { detectGear, getTotalRatio } from './gearDetection';
import { binByRPM, filterBinnedResults, calculateStatistics } from './rpmBinning';

const GRAVITY = 9.81; // m/s²
const CV_TO_WATTS = 735.5; // 1 CV = 735.5 W

export interface AnalysisConfig {
  kart: Kart;
  engine: Engine;
  tyre: Tyre;
  finalDrive: FinalDrive;
  runConditions: RunConditions;
  minRpm: number;
  maxRpm: number;
  filterLevel: number;
}

/**
 * Extract telemetry data for a specific lap
 */
function extractLapData(
  telemetry: TelemetryData,
  lapInfo: LapInfo
): {
  time: number[];
  speed: number[];
  rpm: number[];
  lonAcc: number[];
  latAcc: number[];
  tempHead: number[];
  tempCool: number[];
  tempExhaust: number[];
  lambda: number[];
  throttle: number[];
} {
  const { startIndex, endIndex } = lapInfo;

  return {
    time: telemetry.time.slice(startIndex, endIndex + 1),
    speed: telemetry.speed.slice(startIndex, endIndex + 1),
    rpm: telemetry.rpm.slice(startIndex, endIndex + 1),
    lonAcc: telemetry.lonAcc.slice(startIndex, endIndex + 1),
    latAcc: telemetry.latAcc.slice(startIndex, endIndex + 1),
    tempHead: telemetry.tempHead?.slice(startIndex, endIndex + 1) || [],
    tempCool: telemetry.tempCool?.slice(startIndex, endIndex + 1) || [],
    tempExhaust: telemetry.tempExhaust?.slice(startIndex, endIndex + 1) || [],
    lambda: telemetry.lambda?.slice(startIndex, endIndex + 1) || [],
    throttle: telemetry.throttle?.slice(startIndex, endIndex + 1) || [],
  };
}

/**
 * Calculate power for each data point in selected laps
 *
 * Physics model:
 * F_total = m * a + F_drag + F_rolling + F_inertia_wheels + F_inertia_engine
 *
 * Where:
 * - m * a = linear acceleration force
 * - F_drag = 0.5 * ρ * A * Cd * v²
 * - F_rolling = m * g * (c1 + c2 * v²)
 * - F_inertia_wheels = I_wheel * α / r = I_wheel * a / r²
 * - F_inertia_engine = I_engine * ratio² * a / r²
 *
 * Power = F_total * v
 */
export function calculatePower(
  telemetry: TelemetryData,
  laps: LapInfo[],
  selectedLapIndices: number[],
  config: AnalysisConfig
): PowerDataPoint[] {
  const results: PowerDataPoint[] = [];

  // Configuration values
  const wheelRadius = config.tyre.diameter / 2000; // mm to m
  const finalRatio = config.finalDrive.rearSprocket / config.finalDrive.frontSprocket;

  // Air density for drag calculation
  const airDensity = calculateAirDensity(
    config.runConditions.pressure,
    config.runConditions.temperature,
    config.runConditions.humidity
  );

  // Get lap data for selected laps
  const selectedLaps = laps.filter(lap => selectedLapIndices.includes(lap.index));

  for (const lap of selectedLaps) {
    const lapData = extractLapData(telemetry, lap);

    for (let i = 0; i < lapData.time.length; i++) {
      const speedKmh = lapData.speed[i];
      const speed = speedKmh / 3.6; // km/h to m/s
      const rpm = lapData.rpm[i];
      const lonAccG = lapData.lonAcc[i];
      const lonAcc = lonAccG * GRAVITY; // g to m/s²

      // Skip invalid data points
      if (speed < 5 / 3.6) continue; // Minimum 5 km/h
      if (lonAcc <= 0) continue; // Only during acceleration
      if (rpm < config.minRpm || rpm > config.maxRpm) continue;

      // Detect current gear
      const gear = detectGear(rpm, speed, wheelRadius, finalRatio, config.engine);
      if (gear === 0) continue; // Unable to detect gear

      // Get total ratio for this gear
      const totalRatio = getTotalRatio(gear, finalRatio, config.engine);
      if (totalRatio === 0) continue;

      // Calculate forces

      // 1. Aerodynamic drag
      const dragForce =
        0.5 *
        airDensity *
        config.kart.frontalArea *
        config.kart.dragCoefficient *
        speed *
        speed;

      // 2. Rolling resistance (simplified model)
      const rollingResistance =
        config.kart.weight *
        GRAVITY *
        (config.tyre.rollingCoeff1 + config.tyre.rollingCoeff2 * speed * speed);

      // 3. Linear inertia (mass * acceleration)
      const linearInertia = config.kart.weight * lonAcc;

      // 4. Wheel rotational inertia (2 rear wheels)
      const wheelAngularAcc = lonAcc / wheelRadius;
      const wheelInertiaForce = (2 * config.tyre.inertia * wheelAngularAcc) / wheelRadius;

      // 5. Engine rotational inertia
      const engineAngularAcc = wheelAngularAcc * totalRatio;
      const engineInertiaForce =
        (config.engine.inertia * engineAngularAcc * totalRatio) / wheelRadius;

      // Total wheel force
      const wheelForce =
        linearInertia + dragForce + rollingResistance + wheelInertiaForce + engineInertiaForce;

      // Wheel power (W) and convert to CV
      const wheelPowerW = wheelForce * speed;
      const wheelPowerCV = wheelPowerW / CV_TO_WATTS;

      // Skip unrealistic values
      if (wheelPowerCV < 0 || wheelPowerCV > 100) continue;

      // Wheel torque
      const wheelTorque = wheelForce * wheelRadius;

      results.push({
        rpm,
        speed: speedKmh,
        power: wheelPowerCV,
        torque: wheelTorque,
        gear,
        tempHead: lapData.tempHead[i] || 0,
        tempCool: lapData.tempCool[i] || 0,
        tempExhaust: lapData.tempExhaust[i] || 0,
        lambda: lapData.lambda[i] || 0,
        lapIndex: lap.index,
        timeIndex: i,
      });
    }
  }

  return results;
}

/**
 * Calculate lap telemetry results for visualization
 */
export function calculateLapTelemetry(
  telemetry: TelemetryData,
  laps: LapInfo[],
  selectedLapIndices: number[],
  config: AnalysisConfig
): LapTelemetryResult[] {
  const results: LapTelemetryResult[] = [];

  const wheelRadius = config.tyre.diameter / 2000;
  const finalRatio = config.finalDrive.rearSprocket / config.finalDrive.frontSprocket;

  const selectedLaps = laps.filter(lap => selectedLapIndices.includes(lap.index));

  for (const lap of selectedLaps) {
    const lapData = extractLapData(telemetry, lap);
    const baseTime = lapData.time[0];

    // Calculate power for each point
    const power: number[] = [];
    const gear: number[] = [];

    for (let i = 0; i < lapData.time.length; i++) {
      const speed = lapData.speed[i] / 3.6;
      const rpm = lapData.rpm[i];
      const lonAcc = lapData.lonAcc[i] * GRAVITY;

      // Detect gear
      const detectedGear = detectGear(rpm, speed, wheelRadius, finalRatio, config.engine);
      gear.push(detectedGear);

      // Simple power estimate
      if (speed > 1 && detectedGear > 0 && lonAcc > 0) {
        const force = config.kart.weight * lonAcc;
        const powerW = force * speed;
        power.push(powerW / CV_TO_WATTS);
      } else {
        power.push(0);
      }
    }

    results.push({
      lapIndex: lap.index,
      lapTime: lap.lapTime,
      time: lapData.time.map(t => t - baseTime),
      speed: lapData.speed,
      rpm: lapData.rpm,
      lonAcc: lapData.lonAcc,
      latAcc: lapData.latAcc,
      throttle: lapData.throttle,
      power,
      gear,
      tempHead: lapData.tempHead,
      tempCool: lapData.tempCool,
      tempExhaust: lapData.tempExhaust,
    });
  }

  return results;
}

/**
 * Main analysis function - orchestrates the full analysis pipeline
 */
export function runAnalysis(
  telemetry: TelemetryData,
  laps: LapInfo[],
  selectedLapIndices: number[],
  config: AnalysisConfig
): AnalysisResults {
  // Step 1: Calculate raw power data for all selected laps
  const rawPowerData = calculatePower(telemetry, laps, selectedLapIndices, config);

  // Step 2: Bin results by RPM
  const binnedResults = binByRPM(rawPowerData, config.minRpm, config.maxRpm);

  // Step 3: Apply filtering if specified
  const filteredResults =
    config.filterLevel > 0 ? filterBinnedResults(binnedResults, config.filterLevel) : binnedResults;

  // Step 4: Calculate lap telemetry
  const lapTelemetry = calculateLapTelemetry(telemetry, laps, selectedLapIndices, config);

  // Step 5: Calculate statistics
  const stats = calculateStatistics(filteredResults);

  return {
    binnedResults: filteredResults,
    rawDataPoints: rawPowerData.length,
    lapTelemetry,
    statistics: stats,
    config: {
      kartName: config.kart.name,
      engineName: config.engine.name,
      tyreName: config.tyre.name,
      finalRatio: config.finalDrive.rearSprocket / config.finalDrive.frontSprocket,
      selectedLaps: selectedLapIndices,
    },
    timestamp: new Date().toISOString(),
  };
}
