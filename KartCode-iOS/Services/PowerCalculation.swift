import Foundation

/// Calculates power from sensor data
/// Ported from web-app/src/lib/sensors/sensorPowerCalculation.ts
struct PowerCalculation {

    // MARK: - Constants

    /// Air density at sea level (kg/m³)
    static let airDensity: Double = 1.225

    /// Default drag coefficient × frontal area for kart
    static let defaultCdA: Double = 0.35 * 0.7  // Cd × A

    /// Speed bin width for averaging (km/h)
    static let binWidth: Double = 5.0

    /// Minimum samples required per bin
    static let minSamplesPerBin: Int = 3

    // MARK: - Main Processing

    /// Process sensor samples to generate power curve
    /// - Parameters:
    ///   - samples: Raw sensor samples
    ///   - calibration: Calibration data for coordinate transformation
    ///   - kartWeight: Total weight including driver (kg)
    /// - Returns: Processed speed-power curve and statistics
    static func processSensorData(
        samples: [SensorSample],
        calibration: CalibrationData,
        kartWeight: Double
    ) -> (curve: [SpeedPowerPoint], statistics: SensorSessionStatistics) {
        // Filter samples with valid GPS speed
        let validSamples = samples.filter { $0.gpsSpeed != nil && $0.gpsSpeed! > 0.5 }

        guard !validSamples.isEmpty else {
            return ([], emptyStatistics())
        }

        // Transform accelerations and calculate power for each sample
        var processedPoints: [(speedMs: Double, power: Double, forwardAccel: Double)] = []
        var maxAccel: Double = 0
        var maxDecel: Double = 0

        for sample in validSamples {
            guard let gpsSpeed = sample.gpsSpeed else { continue }

            // Transform acceleration to kart coordinates
            let (forwardAccel, _, _) = calibration.transformAcceleration(
                x: sample.accelX,
                y: sample.accelY,
                z: sample.accelZ
            )

            // Calculate power at wheels
            // P = F × v where F = m × a + drag
            let speedMs = gpsSpeed
            let dragForce = 0.5 * airDensity * defaultCdA * speedMs * speedMs
            let totalForce = kartWeight * forwardAccel + dragForce
            let powerWatts = totalForce * speedMs

            // Only include positive power (acceleration)
            if powerWatts > 0 {
                processedPoints.append((
                    speedMs: speedMs,
                    power: powerWatts,
                    forwardAccel: forwardAccel
                ))
            }

            // Track max acceleration/deceleration
            let accelG = forwardAccel / 9.81
            if accelG > maxAccel {
                maxAccel = accelG
            }
            if accelG < 0 && abs(accelG) > maxDecel {
                maxDecel = abs(accelG)
            }
        }

        // Bin by speed
        let curve = binBySpeed(points: processedPoints)

        // Calculate statistics
        let statistics = calculateStatistics(
            curve: curve,
            samples: samples,
            validSamples: validSamples,
            maxAccel: maxAccel,
            maxDecel: maxDecel
        )

        return (curve, statistics)
    }

    // MARK: - Binning

    /// Bin processed points by speed
    private static func binBySpeed(
        points: [(speedMs: Double, power: Double, forwardAccel: Double)]
    ) -> [SpeedPowerPoint] {
        guard !points.isEmpty else { return [] }

        // Find speed range
        let speedsKmh = points.map { $0.speedMs * 3.6 }
        let minSpeed = speedsKmh.min() ?? 0
        let maxSpeed = speedsKmh.max() ?? 0

        // Create bins
        let startBin = floor(minSpeed / binWidth) * binWidth
        let endBin = ceil(maxSpeed / binWidth) * binWidth

        var bins: [Double: [(power: Double, accel: Double)]] = [:]

        for point in points {
            let speedKmh = point.speedMs * 3.6
            let binCenter = floor(speedKmh / binWidth) * binWidth + binWidth / 2
            bins[binCenter, default: []].append((power: point.power, accel: point.forwardAccel))
        }

        // Average each bin
        var curve: [SpeedPowerPoint] = []

        for binCenter in stride(from: startBin + binWidth / 2, through: endBin, by: binWidth) {
            guard let binPoints = bins[binCenter], binPoints.count >= minSamplesPerBin else {
                continue
            }

            let avgPowerWatts = binPoints.map(\.power).reduce(0, +) / Double(binPoints.count)
            let avgAccel = binPoints.map(\.accel).reduce(0, +) / Double(binPoints.count)

            curve.append(SpeedPowerPoint(
                speedKmh: binCenter,
                speedMs: binCenter / 3.6,
                avgPower: avgPowerWatts / 735.5,  // Convert to CV
                avgPowerWatts: avgPowerWatts,
                avgForwardAccel: avgAccel,
                sampleCount: binPoints.count
            ))
        }

        // Sort by speed
        return curve.sorted { $0.speedKmh < $1.speedKmh }
    }

    // MARK: - Statistics

    private static func calculateStatistics(
        curve: [SpeedPowerPoint],
        samples: [SensorSample],
        validSamples: [SensorSample],
        maxAccel: Double,
        maxDecel: Double
    ) -> SensorSessionStatistics {
        guard let peakPoint = curve.max(by: { $0.avgPower < $1.avgPower }) else {
            return emptyStatistics()
        }

        let maxSpeedKmh = (validSamples.compactMap { $0.gpsSpeed }.max() ?? 0) * 3.6

        return SensorSessionStatistics(
            peakPower: peakPoint.avgPower,
            peakPowerSpeed: peakPoint.speedKmh,
            maxSpeed: maxSpeedKmh,
            maxAcceleration: maxAccel,
            maxDeceleration: maxDecel,
            totalSamples: samples.count,
            validSpeedSamples: validSamples.count
        )
    }

    private static func emptyStatistics() -> SensorSessionStatistics {
        return SensorSessionStatistics(
            peakPower: 0,
            peakPowerSpeed: 0,
            maxSpeed: 0,
            maxAcceleration: 0,
            maxDeceleration: 0,
            totalSamples: 0,
            validSpeedSamples: 0
        )
    }
}
