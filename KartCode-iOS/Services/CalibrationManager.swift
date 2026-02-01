import Foundation
import simd

/// Manages calibration process for sensor coordinate transformation
/// Ported from web-app/src/lib/sensors/calibration.ts
final class CalibrationManager {
    // MARK: - Properties

    private var gravityVector: SIMD3<Double>?
    private var forwardVector: SIMD3<Double>?

    // MARK: - Public Methods

    /// Detect gravity vector from stationary samples
    /// - Parameter samples: Array of (x, y, z) gravity readings
    /// - Returns: Average gravity vector
    func detectGravityVector(from samples: [(x: Double, y: Double, z: Double)]) -> SIMD3<Double> {
        guard !samples.isEmpty else {
            return SIMD3<Double>(0, 0, -1)
        }

        // Calculate average
        var sum = SIMD3<Double>(0, 0, 0)
        for sample in samples {
            sum += SIMD3<Double>(sample.x, sample.y, sample.z)
        }
        let avg = sum / Double(samples.count)

        // Normalize (gravity should be ~1G)
        let magnitude = simd_length(avg)
        let normalized = magnitude > 0 ? avg / magnitude : SIMD3<Double>(0, 0, -1)

        // Store for later use (gravity points down, so we negate for "up")
        gravityVector = normalized * 9.81

        return normalized * 9.81
    }

    /// Detect forward direction from acceleration samples during forward motion
    /// - Parameter samples: Array of (x, y, z) acceleration readings in m/s²
    /// - Returns: Forward direction unit vector, or nil if detection failed
    func detectForwardDirection(from samples: [(x: Double, y: Double, z: Double)]) -> SIMD3<Double>? {
        guard samples.count >= 50 else { return nil }

        // Find periods of significant forward acceleration
        var significantAccelerations: [SIMD3<Double>] = []
        let threshold: Double = 0.5  // m/s² minimum acceleration

        for sample in samples {
            let accel = SIMD3<Double>(sample.x, sample.y, sample.z)
            let magnitude = simd_length(accel)

            if magnitude > threshold {
                significantAccelerations.append(accel)
            }
        }

        guard significantAccelerations.count >= 10 else { return nil }

        // Average the significant accelerations
        var sum = SIMD3<Double>(0, 0, 0)
        for accel in significantAccelerations {
            sum += accel
        }
        let avgAccel = sum / Double(significantAccelerations.count)

        // Normalize
        let magnitude = simd_length(avgAccel)
        guard magnitude > 0.1 else { return nil }

        forwardVector = avgAccel / magnitude
        return forwardVector
    }

    /// Complete calibration and compute rotation matrix
    /// - Parameter accelerationSamples: Samples collected during forward motion
    /// - Returns: Complete calibration data, or nil if calibration failed
    func completeCalibration(accelerationSamples: [(x: Double, y: Double, z: Double)]) -> CalibrationData? {
        guard let gravity = gravityVector else { return nil }

        // Detect forward direction
        guard let forward = detectForwardDirection(from: accelerationSamples) else {
            return nil
        }

        // Compute coordinate system:
        // Up = opposite of gravity
        let up = simd_normalize(-gravity / 9.81)

        // Remove up component from forward to make it horizontal
        let forwardDotUp = simd_dot(forward, up)
        var horizontalForward = forward - (forwardDotUp * up)
        let horizontalMag = simd_length(horizontalForward)

        guard horizontalMag > 0.1 else { return nil }
        horizontalForward = horizontalForward / horizontalMag

        // Right = forward × up (right-hand rule)
        let right = simd_cross(horizontalForward, up)

        // Build rotation matrix (columns are the basis vectors)
        // This transforms from device coordinates to kart coordinates
        let rotationMatrix: [[Double]] = [
            [horizontalForward.x, horizontalForward.y, horizontalForward.z],
            [right.x, right.y, right.z],
            [up.x, up.y, up.z]
        ]

        // Calculate quality score based on how orthogonal the vectors are
        let forwardUpDot = abs(simd_dot(horizontalForward, up))
        let forwardRightDot = abs(simd_dot(horizontalForward, right))
        let upRightDot = abs(simd_dot(up, right))
        let orthogonalityError = forwardUpDot + forwardRightDot + upRightDot
        let qualityScore = max(0, 1.0 - orthogonalityError)

        return CalibrationData(
            gravityVector: [gravity.x, gravity.y, gravity.z],
            forwardVector: [horizontalForward.x, horizontalForward.y, horizontalForward.z],
            rightVector: [right.x, right.y, right.z],
            upVector: [up.x, up.y, up.z],
            rotationMatrix: rotationMatrix,
            qualityScore: qualityScore,
            calibratedAt: Date().timeIntervalSince1970 * 1000
        )
    }

    /// Reset calibration state
    func reset() {
        gravityVector = nil
        forwardVector = nil
    }
}

// MARK: - Calibration Helpers

extension CalibrationData {
    /// Transform acceleration from device to kart coordinates using SIMD
    func transformAccelerationSIMD(_ deviceAccel: SIMD3<Double>) -> SIMD3<Double> {
        let row0 = SIMD3<Double>(rotationMatrix[0][0], rotationMatrix[0][1], rotationMatrix[0][2])
        let row1 = SIMD3<Double>(rotationMatrix[1][0], rotationMatrix[1][1], rotationMatrix[1][2])
        let row2 = SIMD3<Double>(rotationMatrix[2][0], rotationMatrix[2][1], rotationMatrix[2][2])

        return SIMD3<Double>(
            simd_dot(row0, deviceAccel),
            simd_dot(row1, deviceAccel),
            simd_dot(row2, deviceAccel)
        )
    }
}
