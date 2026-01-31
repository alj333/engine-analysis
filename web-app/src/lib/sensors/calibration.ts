/**
 * Calibration system for sensor coordinate transformation
 * Detects gravity and forward direction to build rotation matrix
 */

import type { CalibrationData } from '@/types/sensor';
import type { AccelerometerReading } from './deviceMotion';

type Vector3 = [number, number, number];
type Matrix3x3 = [Vector3, Vector3, Vector3];

const GRAVITY = 9.81; // m/s²
const GRAVITY_SAMPLES = 150; // ~3 seconds at 50Hz
const FORWARD_SAMPLES = 250; // ~5 seconds at 50Hz
const MIN_ACCELERATION_FOR_FORWARD = 0.5; // m/s² - minimum acceleration to detect forward motion

/**
 * Calibration state machine
 */
export class CalibrationManager {
  private gravitySamples: AccelerometerReading[] = [];
  private forwardSamples: AccelerometerReading[] = [];
  private gravityVector: Vector3 | null = null;

  /**
   * Add a sample during gravity calibration (stationary phase)
   * @returns Progress 0-1, or null if calibration failed
   */
  addGravitySample(reading: AccelerometerReading): number {
    this.gravitySamples.push(reading);
    return Math.min(1, this.gravitySamples.length / GRAVITY_SAMPLES);
  }

  /**
   * Check if gravity calibration is complete
   */
  isGravityCalibrationComplete(): boolean {
    return this.gravitySamples.length >= GRAVITY_SAMPLES;
  }

  /**
   * Calculate gravity vector from collected samples
   * @returns Gravity vector or null if calibration failed
   */
  computeGravityVector(): Vector3 | null {
    if (this.gravitySamples.length < GRAVITY_SAMPLES) {
      return null;
    }

    // Average all readings
    const avgX = average(this.gravitySamples.map((s) => s.x));
    const avgY = average(this.gravitySamples.map((s) => s.y));
    const avgZ = average(this.gravitySamples.map((s) => s.z));

    // Validate magnitude is close to gravity
    const magnitude = Math.sqrt(avgX ** 2 + avgY ** 2 + avgZ ** 2);
    if (Math.abs(magnitude - GRAVITY) > 1.5) {
      console.warn('Gravity magnitude out of range:', magnitude);
      // Still proceed, but note the discrepancy
    }

    this.gravityVector = [avgX, avgY, avgZ];
    return this.gravityVector;
  }

  /**
   * Add a sample during forward calibration (driving straight phase)
   * @returns Progress 0-1
   */
  addForwardSample(reading: AccelerometerReading): number {
    this.forwardSamples.push(reading);
    return Math.min(1, this.forwardSamples.length / FORWARD_SAMPLES);
  }

  /**
   * Check if forward calibration is complete
   */
  isForwardCalibrationComplete(): boolean {
    return this.forwardSamples.length >= FORWARD_SAMPLES;
  }

  /**
   * Calculate forward direction using PCA on acceleration during straight-line driving
   * The forward direction is the principal component of acceleration variance
   */
  computeForwardVector(): Vector3 | null {
    if (!this.gravityVector || this.forwardSamples.length < FORWARD_SAMPLES) {
      return null;
    }

    // Remove gravity from each sample to get linear acceleration
    const linearAccel = this.forwardSamples.map((s) => ({
      x: s.x - this.gravityVector![0],
      y: s.y - this.gravityVector![1],
      z: s.z - this.gravityVector![2],
    }));

    // Filter to only samples with significant acceleration
    const significantSamples = linearAccel.filter((s) => {
      const mag = Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2);
      return mag > MIN_ACCELERATION_FOR_FORWARD;
    });

    if (significantSamples.length < 20) {
      console.warn('Not enough acceleration detected for forward calibration');
      // Fall back to using all samples
      return this.computeForwardFromPCA(linearAccel);
    }

    return this.computeForwardFromPCA(significantSamples);
  }

  /**
   * Use Principal Component Analysis to find the direction of maximum variance
   * This should be the forward/backward direction during straight-line driving
   */
  private computeForwardFromPCA(
    samples: { x: number; y: number; z: number }[]
  ): Vector3 | null {
    if (samples.length < 10) return null;

    // Center the data
    const meanX = average(samples.map((s) => s.x));
    const meanY = average(samples.map((s) => s.y));
    const meanZ = average(samples.map((s) => s.z));

    const centered = samples.map((s) => ({
      x: s.x - meanX,
      y: s.y - meanY,
      z: s.z - meanZ,
    }));

    // Compute covariance matrix
    const cov = computeCovarianceMatrix(centered);

    // Find principal eigenvector using power iteration
    const principal = powerIteration(cov);

    // Ensure forward points in the direction of most positive acceleration
    // (assuming we accelerate more than brake during calibration)
    const dotProduct = meanX * principal[0] + meanY * principal[1] + meanZ * principal[2];
    if (dotProduct < 0) {
      principal[0] *= -1;
      principal[1] *= -1;
      principal[2] *= -1;
    }

    return principal;
  }

  /**
   * Build complete calibration data with rotation matrix
   */
  buildCalibrationData(): CalibrationData | null {
    const gravityVector = this.computeGravityVector();
    if (!gravityVector) return null;

    const forwardVector = this.computeForwardVector();
    if (!forwardVector) return null;

    // Up direction is opposite to gravity (normalized)
    const gravityMag = magnitude(gravityVector);
    const upVector: Vector3 = [
      -gravityVector[0] / gravityMag,
      -gravityVector[1] / gravityMag,
      -gravityVector[2] / gravityMag,
    ];

    // Make forward orthogonal to up using Gram-Schmidt
    const forwardDotUp = dot(forwardVector, upVector);
    let forwardOrthogonal: Vector3 = [
      forwardVector[0] - forwardDotUp * upVector[0],
      forwardVector[1] - forwardDotUp * upVector[1],
      forwardVector[2] - forwardDotUp * upVector[2],
    ];
    forwardOrthogonal = normalize(forwardOrthogonal);

    // Right is cross product of forward and up
    const rightVector = cross(forwardOrthogonal, upVector);

    // Build rotation matrix: columns are [forward, right, up] in device coordinates
    // This transforms device coords to kart coords:
    // kartCoords = rotationMatrix^T * deviceCoords
    const rotationMatrix: Matrix3x3 = [
      [forwardOrthogonal[0], rightVector[0], upVector[0]],
      [forwardOrthogonal[1], rightVector[1], upVector[1]],
      [forwardOrthogonal[2], rightVector[2], upVector[2]],
    ];

    // Calculate quality score based on:
    // 1. Gravity magnitude accuracy
    // 2. Forward vector strength
    // 3. Orthogonality
    const gravityQuality = 1 - Math.min(1, Math.abs(gravityMag - GRAVITY) / 2);
    const forwardMag = magnitude(forwardVector);
    const forwardQuality = Math.min(1, forwardMag / 2); // Stronger acceleration = better calibration
    const orthogonalityQuality = 1 - Math.abs(forwardDotUp);

    const qualityScore = (gravityQuality + forwardQuality + orthogonalityQuality) / 3;

    return {
      gravityVector,
      forwardVector: forwardOrthogonal,
      rightVector,
      upVector,
      rotationMatrix,
      qualityScore,
      calibratedAt: Date.now(),
    };
  }

  /**
   * Reset calibration state
   */
  reset(): void {
    this.gravitySamples = [];
    this.forwardSamples = [];
    this.gravityVector = null;
  }
}

// Vector math utilities
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function magnitude(v: Vector3): number {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function normalize(v: Vector3): Vector3 {
  const mag = magnitude(v);
  if (mag === 0) return [0, 0, 0];
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function computeCovarianceMatrix(
  samples: { x: number; y: number; z: number }[]
): Matrix3x3 {
  const n = samples.length;
  let xx = 0,
    xy = 0,
    xz = 0,
    yy = 0,
    yz = 0,
    zz = 0;

  for (const s of samples) {
    xx += s.x * s.x;
    xy += s.x * s.y;
    xz += s.x * s.z;
    yy += s.y * s.y;
    yz += s.y * s.z;
    zz += s.z * s.z;
  }

  return [
    [xx / n, xy / n, xz / n],
    [xy / n, yy / n, yz / n],
    [xz / n, yz / n, zz / n],
  ];
}

/**
 * Power iteration to find principal eigenvector
 */
function powerIteration(matrix: Matrix3x3, iterations: number = 50): Vector3 {
  // Start with arbitrary vector
  let v: Vector3 = [1, 1, 1];
  v = normalize(v);

  for (let i = 0; i < iterations; i++) {
    // Matrix-vector multiplication
    const next: Vector3 = [
      matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2],
      matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2],
      matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2],
    ];
    v = normalize(next);
  }

  return v;
}

/**
 * Apply calibration to transform device acceleration to kart coordinates
 * @returns [forward, right, up] acceleration in m/s²
 */
export function transformAcceleration(
  reading: AccelerometerReading,
  calibration: CalibrationData
): { forward: number; right: number; up: number } {
  // Remove gravity first
  const linearX = reading.x - calibration.gravityVector[0];
  const linearY = reading.y - calibration.gravityVector[1];
  const linearZ = reading.z - calibration.gravityVector[2];

  // Apply rotation matrix transpose (columns become rows for inverse)
  const m = calibration.rotationMatrix;
  return {
    forward: m[0][0] * linearX + m[1][0] * linearY + m[2][0] * linearZ,
    right: m[0][1] * linearX + m[1][1] * linearY + m[2][1] * linearZ,
    up: m[0][2] * linearX + m[1][2] * linearY + m[2][2] * linearZ,
  };
}
