/**
 * Data filtering and smoothing functions for telemetry data
 * Reduces noise while preserving important signal characteristics
 */

/**
 * Calculate the average of an array of numbers
 */
export function average(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(data: number[]): number {
  if (data.length < 2) return 0;
  const avg = average(data);
  const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(average(squaredDiffs));
}

/**
 * Simple moving average filter
 * Good for general noise reduction
 *
 * @param data - Input data array
 * @param windowSize - Size of the moving window (odd number recommended)
 * @returns Smoothed data array
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  if (windowSize < 1 || data.length === 0) return data;

  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data.slice(start, end);
    result.push(average(window));
  }

  return result;
}

/**
 * Weighted moving average - gives more weight to center values
 * Better at preserving peaks than simple moving average
 *
 * @param data - Input data array
 * @param windowSize - Size of the moving window
 * @returns Smoothed data array
 */
export function weightedMovingAverage(data: number[], windowSize: number): number[] {
  if (windowSize < 1 || data.length === 0) return data;

  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  // Generate triangular weights
  const weights: number[] = [];
  for (let i = 0; i < windowSize; i++) {
    weights.push(halfWindow + 1 - Math.abs(i - halfWindow));
  }

  for (let i = 0; i < data.length; i++) {
    let weightedSum = 0;
    let actualWeightSum = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        const weight = weights[j + halfWindow];
        weightedSum += data[idx] * weight;
        actualWeightSum += weight;
      }
    }

    result.push(weightedSum / actualWeightSum);
  }

  return result;
}

/**
 * Savitzky-Golay filter coefficients for quadratic smoothing
 * Good for preserving peaks and derivatives while smoothing
 * Pre-computed coefficients for common window sizes
 */
const SG_COEFFICIENTS: Record<number, number[]> = {
  5: [-3, 12, 17, 12, -3].map(c => c / 35),
  7: [-2, 3, 6, 7, 6, 3, -2].map(c => c / 21),
  9: [-21, 14, 39, 54, 59, 54, 39, 14, -21].map(c => c / 231),
};

/**
 * Savitzky-Golay smoothing filter
 * Excellent for preserving curve shape while removing noise
 *
 * @param data - Input data array
 * @param windowSize - Window size (5, 7, or 9)
 * @returns Smoothed data array
 */
export function savitzkyGolay(data: number[], windowSize: 5 | 7 | 9 = 5): number[] {
  if (data.length === 0) return data;

  const coefficients = SG_COEFFICIENTS[windowSize];
  if (!coefficients) return movingAverage(data, windowSize);

  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    let smoothedValue = 0;

    for (let j = 0; j < windowSize; j++) {
      const idx = i + j - halfWindow;
      // Mirror at boundaries
      const boundedIdx = Math.max(0, Math.min(data.length - 1, idx));
      smoothedValue += data[boundedIdx] * coefficients[j];
    }

    result.push(smoothedValue);
  }

  return result;
}

/**
 * Remove outliers based on standard deviation
 * Replaces outliers with interpolated values
 *
 * @param data - Input data array
 * @param threshold - Number of standard deviations to use as threshold
 * @returns Data with outliers removed
 */
export function removeOutliers(data: number[], threshold: number = 3): number[] {
  if (data.length < 3) return data;

  const avg = average(data);
  const std = standardDeviation(data);
  const result = [...data];

  for (let i = 0; i < result.length; i++) {
    if (Math.abs(result[i] - avg) > threshold * std) {
      // Replace with interpolated value
      const prev = i > 0 ? result[i - 1] : result[i + 1];
      const next = i < result.length - 1 ? result[i + 1] : result[i - 1];
      result[i] = (prev + next) / 2;
    }
  }

  return result;
}

/**
 * Apply filtering to power curve data based on filter level
 *
 * @param data - Array of power values
 * @param filterLevel - Filter strength (0-100)
 * @returns Filtered data array
 */
export function applyPowerFilter(data: number[], filterLevel: number): number[] {
  if (filterLevel <= 0) return data;

  // Map filter level to window size (0 = no filter, 100 = heavy smoothing)
  if (filterLevel <= 25) {
    return savitzkyGolay(data, 5);
  } else if (filterLevel <= 50) {
    return savitzkyGolay(data, 7);
  } else if (filterLevel <= 75) {
    return savitzkyGolay(data, 9);
  } else {
    // Heavy filtering - apply multiple passes
    let result = savitzkyGolay(data, 9);
    result = movingAverage(result, 5);
    return result;
  }
}
