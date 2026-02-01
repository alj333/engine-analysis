import Foundation

/// HTTP client for Convex API
/// Handles queries and mutations to Convex backend
actor ConvexService {
    // MARK: - Singleton

    static let shared = ConvexService()

    // MARK: - Properties

    private let baseURL: URL
    private let session: URLSession
    private var authToken: String?

    // MARK: - Initialization

    private init() {
        self.baseURL = URL(string: AppConfig.convexURL)!
        self.session = URLSession(configuration: .default)
    }

    // MARK: - Authentication

    func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Generic Request Methods

    /// Execute a Convex query
    func query<T: Decodable>(
        _ path: String,
        args: [String: Any] = [:]
    ) async throws -> T {
        let url = baseURL.appendingPathComponent("api/query")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = [
            "path": path,
            "args": args
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw ConvexServiceError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        let result = try decoder.decode(ConvexResponse<T>.self, from: data)

        if let error = result.error {
            throw ConvexServiceError.serverError(message: error.message)
        }

        guard let value = result.value else {
            throw ConvexServiceError.noData
        }

        return value
    }

    /// Execute a Convex mutation
    func mutation<T: Decodable>(
        _ path: String,
        args: Encodable
    ) async throws -> T {
        let url = baseURL.appendingPathComponent("api/mutation")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Encode args to dictionary
        let argsData = try JSONEncoder().encode(args)
        let argsDict = try JSONSerialization.jsonObject(with: argsData) as? [String: Any] ?? [:]

        let body: [String: Any] = [
            "path": path,
            "args": argsDict
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw ConvexServiceError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        let result = try decoder.decode(ConvexResponse<T>.self, from: data)

        if let error = result.error {
            throw ConvexServiceError.serverError(message: error.message)
        }

        guard let value = result.value else {
            throw ConvexServiceError.noData
        }

        return value
    }

    /// Execute a mutation that returns void
    func mutationVoid(
        _ path: String,
        args: Encodable
    ) async throws {
        let url = baseURL.appendingPathComponent("api/mutation")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let argsData = try JSONEncoder().encode(args)
        let argsDict = try JSONSerialization.jsonObject(with: argsData) as? [String: Any] ?? [:]

        let body: [String: Any] = [
            "path": path,
            "args": argsDict
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ConvexServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw ConvexServiceError.httpError(statusCode: httpResponse.statusCode)
        }

        // Check for error in response
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let error = json["error"] as? [String: Any],
           let message = error["message"] as? String {
            throw ConvexServiceError.serverError(message: message)
        }
    }

    // MARK: - Sensor Session Methods

    /// List all sensor sessions for current user
    func listSensorSessions() async throws -> [ConvexSensorSession] {
        return try await query("sensorSessions:list")
    }

    /// Get a sensor session by ID
    func getSensorSession(id: String) async throws -> ConvexSensorSession {
        return try await query("sensorSessions:get", args: ["sessionId": id])
    }

    /// Create a new sensor session
    func createSensorSession(_ request: CreateSensorSessionRequest) async throws -> String {
        return try await mutation("sensorSessions:create", args: request)
    }

    /// Upload a chunk of sensor samples
    func uploadSampleChunk(_ request: UploadSampleChunkRequest) async throws {
        try await mutationVoid("sensorSamples:uploadChunk", args: request)
    }

    /// Rename a sensor session
    func renameSensorSession(id: String, name: String) async throws {
        struct Args: Encodable {
            let sessionId: String
            let name: String
        }
        try await mutationVoid("sensorSessions:rename", args: Args(sessionId: id, name: name))
    }

    /// Delete a sensor session
    func deleteSensorSession(id: String) async throws {
        struct Args: Encodable {
            let sessionId: String
        }
        try await mutationVoid("sensorSessions:remove", args: Args(sessionId: id))
    }

    // MARK: - Custom Configs Methods

    /// Get all custom configs for current user
    func getAllCustomConfigs() async throws -> AllCustomConfigsResponse {
        return try await query("customConfigs:getAllCustomConfigs")
    }
}

// MARK: - Errors

enum ConvexServiceError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case serverError(message: String)
    case noData

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .serverError(let message):
            return message
        case .noData:
            return "No data returned from server"
        }
    }
}
