import Foundation
import SwiftData
import BackgroundTasks

/// Manages synchronization between local storage and Convex cloud
@MainActor
final class SyncManager: ObservableObject {
    // MARK: - Singleton

    static let shared = SyncManager()

    // MARK: - Published Properties

    @Published private(set) var syncStatus: SyncStatus = .idle
    @Published private(set) var pendingCount: Int = 0
    @Published private(set) var lastSyncDate: Date?
    @Published private(set) var isOnline: Bool = true

    // MARK: - Types

    enum SyncStatus: String {
        case idle
        case syncing
        case error
        case offline
    }

    // MARK: - Private Properties

    private var modelContainer: ModelContainer?
    private let convexService = ConvexService.shared
    private let chunkSize = 1000

    // MARK: - Initialization

    private init() {
        setupModelContainer()
        observeNetworkStatus()
    }

    private func setupModelContainer() {
        do {
            let schema = Schema([LocalSensorSession.self])
            let config = ModelConfiguration(isStoredInMemoryOnly: false)
            modelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            print("Failed to create model container: \(error)")
        }
    }

    private func observeNetworkStatus() {
        // TODO: Use NWPathMonitor for real network status
        isOnline = true
    }

    // MARK: - Public Methods

    /// Save a sensor session locally and queue for sync
    func saveSensorSession(
        name: String,
        kartWeight: Double,
        recordingDuration: TimeInterval,
        calibration: CalibrationData,
        samples: [SensorSample],
        speedPowerCurve: [SpeedPowerPoint],
        statistics: SensorSessionStatistics,
        storeRawSamples: Bool = true
    ) async throws {
        guard let container = modelContainer else {
            throw SyncError.noStorage
        }

        let context = ModelContext(container)

        // Create local session
        let session = LocalSensorSession(
            name: name,
            kartWeight: kartWeight,
            recordingDuration: recordingDuration,
            calibration: calibration,
            samples: storeRawSamples ? samples : [],
            speedPowerCurve: speedPowerCurve,
            statistics: statistics
        )

        context.insert(session)
        try context.save()

        // Update pending count
        await updatePendingCount()

        // Try to sync immediately if online
        if isOnline {
            await syncPendingSessions()
        }
    }

    /// Sync all pending sessions to cloud
    func syncPendingSessions() async {
        guard isOnline else {
            syncStatus = .offline
            return
        }

        guard let container = modelContainer else { return }

        syncStatus = .syncing

        do {
            let context = ModelContext(container)

            // Fetch pending sessions
            let descriptor = FetchDescriptor<LocalSensorSession>(
                predicate: #Predicate { $0.syncStatus == "pending" || $0.syncStatus == "failed" }
            )
            let pendingSessions = try context.fetch(descriptor)

            for session in pendingSessions {
                try await syncSession(session, context: context)
            }

            syncStatus = .idle
            lastSyncDate = Date()
        } catch {
            syncStatus = .error
            print("Sync error: \(error)")
        }

        await updatePendingCount()
    }

    /// Fetch sessions from cloud and merge with local
    func fetchRemoteSessions() async throws -> [ConvexSensorSession] {
        guard isOnline else {
            throw SyncError.offline
        }

        return try await convexService.listSensorSessions()
    }

    /// Delete a session (local and remote)
    func deleteSession(_ session: LocalSensorSession) async throws {
        guard let container = modelContainer else { return }

        let context = ModelContext(container)

        // Delete from cloud if synced
        if let convexId = session.convexId {
            try await convexService.deleteSensorSession(id: convexId)
        }

        // Delete locally
        context.delete(session)
        try context.save()

        await updatePendingCount()
    }

    // MARK: - Background Sync

    /// Register background task for sync
    func registerBackgroundSync() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.kartcode.sync",
            using: nil
        ) { task in
            Task {
                await self.handleBackgroundSync(task as! BGProcessingTask)
            }
        }
    }

    /// Schedule background sync
    func scheduleBackgroundSync() {
        let request = BGProcessingTaskRequest(identifier: "com.kartcode.sync")
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Failed to schedule background sync: \(error)")
        }
    }

    private func handleBackgroundSync(_ task: BGProcessingTask) async {
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        await syncPendingSessions()
        task.setTaskCompleted(success: syncStatus == .idle)

        // Schedule next sync
        scheduleBackgroundSync()
    }

    // MARK: - Private Methods

    private func syncSession(_ session: LocalSensorSession, context: ModelContext) async throws {
        guard let calibration = session.calibration,
              let statistics = session.statistics else {
            throw SyncError.invalidSession
        }

        session.lastSyncAttempt = Date()

        // Create session on server
        let request = CreateSensorSessionRequest(
            name: session.name,
            kartWeight: session.kartWeight,
            recordingDuration: session.recordingDuration,
            calibration: calibration,
            speedPowerCurve: session.speedPowerCurve,
            statistics: statistics,
            storeRawSamples: !session.samples.isEmpty
        )

        let convexId = try await convexService.createSensorSession(request)
        session.convexId = convexId

        // Upload samples in chunks if present
        let samples = session.samples
        if !samples.isEmpty {
            let totalChunks = (samples.count + chunkSize - 1) / chunkSize

            for i in 0..<totalChunks {
                let start = i * chunkSize
                let end = min(start + chunkSize, samples.count)
                let chunk = Array(samples[start..<end])

                let chunkRequest = UploadSampleChunkRequest(
                    sensorSessionId: convexId,
                    chunkIndex: i,
                    samples: chunk
                )

                try await convexService.uploadSampleChunk(chunkRequest)
            }
        }

        session.syncStatus = "synced"
        try context.save()
    }

    private func updatePendingCount() async {
        guard let container = modelContainer else { return }

        let context = ModelContext(container)
        let descriptor = FetchDescriptor<LocalSensorSession>(
            predicate: #Predicate { $0.syncStatus == "pending" || $0.syncStatus == "failed" }
        )

        pendingCount = (try? context.fetchCount(descriptor)) ?? 0
    }
}

// MARK: - Errors

enum SyncError: LocalizedError {
    case noStorage
    case offline
    case invalidSession

    var errorDescription: String? {
        switch self {
        case .noStorage:
            return "Local storage not available"
        case .offline:
            return "No network connection"
        case .invalidSession:
            return "Invalid session data"
        }
    }
}
