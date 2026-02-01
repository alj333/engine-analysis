import Foundation
import Combine

/// View model for SessionsListView
/// Manages session list loading and operations
@MainActor
final class SessionsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published private(set) var sessions: [ConvexSensorSession] = []
    @Published private(set) var isLoading: Bool = true
    @Published private(set) var error: Error?
    @Published var selectedSession: ConvexSensorSession?

    // MARK: - Services

    private let syncManager: SyncManager

    // MARK: - Initialization

    init(syncManager: SyncManager = .shared) {
        self.syncManager = syncManager
    }

    // MARK: - Actions

    /// Load sessions from remote
    func loadSessions() async {
        isLoading = true
        error = nil

        do {
            sessions = try await syncManager.fetchRemoteSessions()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    /// Refresh sessions (for pull-to-refresh)
    func refreshSessions() async {
        error = nil

        do {
            sessions = try await syncManager.fetchRemoteSessions()
        } catch {
            self.error = error
        }
    }

    /// Delete a session
    func deleteSession(_ session: ConvexSensorSession) async {
        // TODO: Implement delete via sync manager
        // Remove from local list immediately for responsiveness
        sessions.removeAll { $0.id == session.id }
    }

    /// Delete sessions at indices
    func deleteSessions(at offsets: IndexSet) {
        let sessionsToDelete = offsets.map { sessions[$0] }
        sessions.remove(atOffsets: offsets)

        // Delete from backend asynchronously
        Task {
            for session in sessionsToDelete {
                await deleteSession(session)
            }
        }
    }

    /// Select a session for detail view
    func selectSession(_ session: ConvexSensorSession) {
        selectedSession = session
    }

    /// Clear selected session
    func clearSelection() {
        selectedSession = nil
    }
}

// MARK: - Session Detail ViewModel

@MainActor
final class SessionDetailViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published private(set) var session: ConvexSensorSession
    @Published private(set) var samples: [SensorSample] = []
    @Published private(set) var isLoadingSamples: Bool = false
    @Published private(set) var samplesError: Error?

    // MARK: - Initialization

    init(session: ConvexSensorSession) {
        self.session = session
    }

    // MARK: - Actions

    /// Load raw samples if available
    func loadSamples() async {
        guard session.hasRawSamples else { return }

        isLoadingSamples = true
        samplesError = nil

        do {
            // TODO: Fetch samples via ConvexService
            // samples = try await convexService.getSensorSessionWithSamples(id: session.id).samples
        } catch {
            samplesError = error
        }

        isLoadingSamples = false
    }

    /// Format duration for display
    func formatDuration(_ ms: TimeInterval) -> String {
        let totalSeconds = Int(ms / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    /// Format date for display
    func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
