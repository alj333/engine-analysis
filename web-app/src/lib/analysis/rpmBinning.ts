import type { PowerDataPoint, BinnedResult } from '@/types/results';
import { average, applyPowerFilter } from './dataFiltering';

/**
 * Bin power calculation results by RPM
 * Groups all data points within RPM ranges and calculates averages
 *
 * @param results - Array of power data points from calculation
 * @param minRPM - Minimum RPM to include
 * @param maxRPM - Maximum RPM to include
 * @param binSize - Size of each RPM bin (default 100 RPM)
 * @returns Array of binned results sorted by RPM
 */
export function binByRPM(
  results: PowerDataPoint[],
  minRPM: number,
  maxRPM: number,
  binSize: number = 100
): BinnedResult[] {
  const bins = new Map<number, PowerDataPoint[]>();

  // Group results into RPM bins
  for (const result of results) {
    if (result.rpm < minRPM || result.rpm > maxRPM) continue;

    const binKey = Math.floor(result.rpm / binSize) * binSize;
    if (!bins.has(binKey)) {
      bins.set(binKey, []);
    }
    bins.get(binKey)!.push(result);
  }

  // Calculate averages for each bin
  const binnedResults: BinnedResult[] = [];

  for (const [rpm, samples] of bins.entries()) {
    // Need minimum samples for reliable data (reduced from 3 to 1 for flexibility)
    if (samples.length < 1) continue;

    // Calculate averages
    const avgPower = average(samples.map(s => s.power));
    const avgTorque = average(samples.map(s => s.torque));

    // Only include positive power values
    if (avgPower <= 0) continue;

    binnedResults.push({
      rpm: rpm + binSize / 2, // Use bin center
      avgSpeed: average(samples.map(s => s.speed)),
      avgPower,
      avgTorque,
      avgTempHead: average(samples.map(s => s.tempHead).filter(t => t > 0)) || 0,
      avgTempCool: average(samples.map(s => s.tempCool).filter(t => t > 0)) || 0,
      avgTempExhaust: average(samples.map(s => s.tempExhaust).filter(t => t > 0)) || 0,
      avgLambda: average(samples.map(s => s.lambda).filter(l => l > 0)) || 0,
      sampleCount: samples.length,
    });
  }

  return binnedResults.sort((a, b) => a.rpm - b.rpm);
}

/**
 * Apply smoothing filter to binned results
 *
 * @param results - Binned results array
 * @param filterLevel - Filter strength (0-100)
 * @returns Filtered binned results
 */
export function filterBinnedResults(
  results: BinnedResult[],
  filterLevel: number
): BinnedResult[] {
  if (results.length < 3 || filterLevel <= 0) return results;

  // Extract power and torque arrays
  const powerValues = results.map(r => r.avgPower);
  const torqueValues = results.map(r => r.avgTorque);

  // Apply filtering
  const filteredPower = applyPowerFilter(powerValues, filterLevel);
  const filteredTorque = applyPowerFilter(torqueValues, filterLevel);

  // Rebuild results with filtered values
  return results.map((result, i) => ({
    ...result,
    avgPower: filteredPower[i],
    avgTorque: filteredTorque[i],
  }));
}

/**
 * Find peak power and RPM
 */
export function findPeakPower(results: BinnedResult[]): { rpm: number; power: number } {
  if (results.length === 0) return { rpm: 0, power: 0 };

  let maxPower = 0;
  let peakRPM = 0;

  for (const result of results) {
    if (result.avgPower > maxPower) {
      maxPower = result.avgPower;
      peakRPM = result.rpm;
    }
  }

  return { rpm: peakRPM, power: maxPower };
}

/**
 * Find peak torque and RPM
 */
export function findPeakTorque(results: BinnedResult[]): { rpm: number; torque: number } {
  if (results.length === 0) return { rpm: 0, torque: 0 };

  let maxTorque = 0;
  let peakRPM = 0;

  for (const result of results) {
    if (result.avgTorque > maxTorque) {
      maxTorque = result.avgTorque;
      peakRPM = result.rpm;
    }
  }

  return { rpm: peakRPM, torque: maxTorque };
}

/**
 * Calculate statistics for the binned results
 */
export function calculateStatistics(results: BinnedResult[]): {
  peakPower: { rpm: number; power: number };
  peakTorque: { rpm: number; torque: number };
  avgPower: number;
  avgTorque: number;
  rpmRange: { min: number; max: number };
  totalSamples: number;
} {
  if (results.length === 0) {
    return {
      peakPower: { rpm: 0, power: 0 },
      peakTorque: { rpm: 0, torque: 0 },
      avgPower: 0,
      avgTorque: 0,
      rpmRange: { min: 0, max: 0 },
      totalSamples: 0,
    };
  }

  const peakPower = findPeakPower(results);
  const peakTorque = findPeakTorque(results);
  const avgPower = average(results.map(r => r.avgPower));
  const avgTorque = average(results.map(r => r.avgTorque));
  const rpmValues = results.map(r => r.rpm);
  const totalSamples = results.reduce((sum, r) => sum + r.sampleCount, 0);

  return {
    peakPower,
    peakTorque,
    avgPower,
    avgTorque,
    rpmRange: {
      min: Math.min(...rpmValues),
      max: Math.max(...rpmValues),
    },
    totalSamples,
  };
}
