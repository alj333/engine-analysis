import Foundation
import SwiftData
import CoreLocation

// MARK: - Raw Sensor Sample

/// Raw sensor sample captured during recording (matches web SensorSample type)
struct SensorSample: Codable, Identifiable {
    var id: UUID = UUID()
    let timestamp: TimeInterval  // ms since recording start

    // Accelerometer data (m/s²)
    let accelX: Double
    let accelY: Double
    let accelZ: Double

    // GPS data
    let gpsSpeed: Double?        // m/s
    let gpsAccuracy: Double?     // meters
    let latitude: Double?
    let longitude: Double?

    init(
        timestamp: TimeInterval,
        accelX: Double,
        accelY: Double,
        accelZ: Double,
        gpsSpeed: Double? = nil,
        gpsAccuracy: Double? = nil,
        latitude: Double? = nil,
        longitude: Double? = nil
    ) {
        self.timestamp = timestamp
        self.accelX = accelX
        self.accelY = accelY
        self.accelZ = accelZ
        self.gpsSpeed = gpsSpeed
        self.gpsAccuracy = gpsAccuracy
        self.latitude = latitude
        self.longitude = longitude
    }

    enum CodingKeys: String, CodingKey {
        case timestamp, accelX, accelY, accelZ
        case gpsSpeed, gpsAccuracy, latitude, longitude
    }
}

// MARK: - Calibration Data

/// Calibration data for coordinate transformation (matches web CalibrationData type)
struct CalibrationData: Codable {
    /// Gravity vector in device coordinates (m/s²)
    let gravityVector: [Double]  // [x, y, z]

    /// Forward direction in device coordinates (unit vector)
    let forwardVector: [Double]

    /// Right direction in device coordinates (unit vector)
    let rightVector: [Double]

    /// Up direction in device coordinates (unit vector)
    let upVector: [Double]

    /// 3x3 rotation matrix: device coords → kart coords
    let rotationMatrix: [[Double]]

    /// Quality score (0-1) indicating calibration confidence
    let qualityScore: Double

    /// Timestamp when calibration was completed
    let calibratedAt: TimeInterval

    /// Transform acceleration from device to kart coordinates
    func transformAcceleration(x: Double, y: Double, z: Double) -> (forward: Double, right: Double, up: Double) {
        let forward = rotationMatrix[0][0] * x + rotationMatrix[0][1] * y + rotationMatrix[0][2] * z
        let right = rotationMatrix[1][0] * x + rotationMatrix[1][1] * y + rotationMatrix[1][2] * z
        let up = rotationMatrix[2][0] * x + rotationMatrix[2][1] * y + rotationMatrix[2][2] * z
        return (forward, right, up)
    }
}

// MARK: - Speed Power Point

/// Processed power/speed data point for charting (matches web SpeedPowerPoint type)
struct SpeedPowerPoint: Codable, Identifiable {
    var id: Double { speedKmh }

    let speedKmh: Double        // Center of speed bin (km/h)
    let speedMs: Double         // Center of speed bin (m/s)
    let avgPower: Double        // Average power (CV)
    let avgPowerWatts: Double   // Average power (W)
    let avgForwardAccel: Double // Average forward acceleration (m/s²)
    let sampleCount: Int        // Number of samples in this bin
}

// MARK: - Session Statistics

/// Summary statistics for a sensor session (matches web SensorSessionStatistics type)
struct SensorSessionStatistics: Codable {
    let peakPower: Double       // CV
    let peakPowerSpeed: Double  // km/h at peak power
    let maxSpeed: Double        // km/h
    let maxAcceleration: Double // G-force
    let maxDeceleration: Double // G-force (positive value)
    let totalSamples: Int
    let validSpeedSamples: Int  // Samples with GPS speed
}

// MARK: - SwiftData Model for Local Storage

@Model
final class LocalSensorSession {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    var updatedAt: Date

    // Recording parameters
    var kartWeight: Double      // kg (including driver)
    var recordingDuration: TimeInterval  // ms

    // Calibration data (stored as JSON)
    var calibrationJSON: Data?

    // Raw samples (stored as JSON, can be large)
    var samplesJSON: Data?

    // Processed results (stored as JSON)
    var speedPowerCurveJSON: Data?
    var statisticsJSON: Data?

    // Sync status
    var syncStatus: String      // "pending", "synced", "failed"
    var convexId: String?       // Remote ID after sync
    var lastSyncAttempt: Date?

    init(
        name: String,
        kartWeight: Double,
        recordingDuration: TimeInterval,
        calibration: CalibrationData,
        samples: [SensorSample],
        speedPowerCurve: [SpeedPowerPoint],
        statistics: SensorSessionStatistics
    ) {
        self.id = UUID()
        self.name = name
        self.createdAt = Date()
        self.updatedAt = Date()
        self.kartWeight = kartWeight
        self.recordingDuration = recordingDuration
        self.syncStatus = "pending"

        // Encode complex objects as JSON
        let encoder = JSONEncoder()
        self.calibrationJSON = try? encoder.encode(calibration)
        self.samplesJSON = try? encoder.encode(samples)
        self.speedPowerCurveJSON = try? encoder.encode(speedPowerCurve)
        self.statisticsJSON = try? encoder.encode(statistics)
    }

    // MARK: - Computed Properties

    var calibration: CalibrationData? {
        guard let data = calibrationJSON else { return nil }
        return try? JSONDecoder().decode(CalibrationData.self, from: data)
    }

    var samples: [SensorSample] {
        guard let data = samplesJSON else { return [] }
        return (try? JSONDecoder().decode([SensorSample].self, from: data)) ?? []
    }

    var speedPowerCurve: [SpeedPowerPoint] {
        guard let data = speedPowerCurveJSON else { return [] }
        return (try? JSONDecoder().decode([SpeedPowerPoint].self, from: data)) ?? []
    }

    var statistics: SensorSessionStatistics? {
        guard let data = statisticsJSON else { return nil }
        return try? JSONDecoder().decode(SensorSessionStatistics.self, from: data)
    }
}

// MARK: - Recording State

/// Recording state machine states (matches web RecordingState type)
enum RecordingState: String, CaseIterable {
    case idle
    case requestingPermissions = "requesting-permissions"
    case calibratingGravity = "calibrating-gravity"
    case calibratingForward = "calibrating-forward"
    case recording
    case paused
    case stopped
    case processing
    case error
}

/// Calibration step for UI display
enum CalibrationStep: String, CaseIterable {
    case gravity
    case forward
}

/// Sensor permissions status
struct SensorPermissions {
    var motion: PermissionStatus
    var location: PermissionStatus

    enum PermissionStatus: String {
        case granted
        case denied
        case prompt
        case notSupported = "not-supported"
    }
}
