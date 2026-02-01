import Foundation

// MARK: - Convex API Response Types

/// Generic Convex query/mutation response
struct ConvexResponse<T: Decodable>: Decodable {
    let value: T?
    let error: ConvexError?
}

struct ConvexError: Decodable {
    let message: String
    let code: String?
}

// MARK: - User Model

struct ConvexUser: Codable, Identifiable {
    let _id: String
    let clerkId: String
    let email: String
    let name: String?
    let createdAt: TimeInterval

    var id: String { _id }
}

// MARK: - Sensor Session (Convex format)

struct ConvexSensorSession: Codable, Identifiable {
    let _id: String
    let userId: String
    let name: String
    let createdAt: TimeInterval
    let updatedAt: TimeInterval
    let kartWeight: Double
    let recordingDuration: TimeInterval
    let calibration: CalibrationData
    let speedPowerCurve: [SpeedPowerPoint]
    let statistics: SensorSessionStatistics
    let hasRawSamples: Bool

    var id: String { _id }

    // Convert to local model
    func toLocal() -> LocalSensorSession {
        return LocalSensorSession(
            name: name,
            kartWeight: kartWeight,
            recordingDuration: recordingDuration,
            calibration: calibration,
            samples: [],  // Samples fetched separately
            speedPowerCurve: speedPowerCurve,
            statistics: statistics
        )
    }
}

// MARK: - Sensor Sample Chunk (Convex format)

struct ConvexSensorSampleChunk: Codable, Identifiable {
    let _id: String
    let sensorSessionId: String
    let chunkIndex: Int
    let samples: [SensorSample]

    var id: String { _id }
}

// MARK: - Create Session Request

struct CreateSensorSessionRequest: Encodable {
    let name: String
    let kartWeight: Double
    let recordingDuration: TimeInterval
    let calibration: CalibrationData
    let speedPowerCurve: [SpeedPowerPoint]
    let statistics: SensorSessionStatistics
    let storeRawSamples: Bool
}

// MARK: - Upload Chunk Request

struct UploadSampleChunkRequest: Encodable {
    let sensorSessionId: String
    let chunkIndex: Int
    let samples: [SensorSample]
}

// MARK: - Custom Configs (Convex format)

struct ConvexCustomKart: Codable, Identifiable {
    let _id: String
    let userId: String
    let name: String
    let weight: Double
    let frontalArea: Double
    let dragCoefficient: Double
    let createdAt: TimeInterval
    let updatedAt: TimeInterval

    var id: String { _id }
}

struct ConvexGearPair: Codable {
    let input: Double
    let output: Double
}

struct ConvexGearbox: Codable {
    let primary: ConvexGearPair
    let gears: [ConvexGearPair]
}

struct ConvexCustomEngine: Codable, Identifiable {
    let _id: String
    let userId: String
    let name: String
    let category: String
    let inertia: Double
    let gearbox: ConvexGearbox
    let createdAt: TimeInterval
    let updatedAt: TimeInterval

    var id: String { _id }
}

struct ConvexCustomTyre: Codable, Identifiable {
    let _id: String
    let userId: String
    let name: String
    let diameter: Double
    let inertia: Double
    let rollingCoeff1: Double
    let rollingCoeff2: Double
    let rimType: String  // "aluminum" or "magnesium"
    let createdAt: TimeInterval
    let updatedAt: TimeInterval

    var id: String { _id }
}

// MARK: - All Custom Configs Response

struct AllCustomConfigsResponse: Codable {
    let karts: [ConvexCustomKart]
    let engines: [ConvexCustomEngine]
    let tyres: [ConvexCustomTyre]
}
