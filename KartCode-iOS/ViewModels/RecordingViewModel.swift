import Foundation
import Combine

/// View model for RecordingView
/// Manages recording state and coordinates between SensorRecordingService and SyncManager
@MainActor
final class RecordingViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var kartWeight: Double = 180
    @Published var sessionName: String = ""
    @Published var storeRawSamples: Bool = true
    @Published var showingSaveDialog: Bool = false
    @Published var isSaving: Bool = false
    @Published var saveError: Error?

    // MARK: - Services

    let recordingService: SensorRecordingService
    private let syncManager: SyncManager

    // MARK: - Initialization

    init(
        recordingService: SensorRecordingService = SensorRecordingService(),
        syncManager: SyncManager = .shared
    ) {
        self.recordingService = recordingService
        self.syncManager = syncManager
    }

    // MARK: - Computed Properties

    var defaultSessionName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return "Session \(formatter.string(from: Date()))"
    }

    var canSave: Bool {
        recordingService.state == .stopped &&
        recordingService.calibration != nil &&
        !recordingService.samples.isEmpty
    }

    // MARK: - Actions

    func startRecording() async {
        do {
            try await recordingService.startRecording(kartWeight: kartWeight)
        } catch {
            saveError = error
        }
    }

    func stopRecording() {
        recordingService.stopRecording()
    }

    func pauseRecording() {
        recordingService.pauseRecording()
    }

    func resumeRecording() {
        recordingService.resumeRecording()
    }

    func reset() {
        recordingService.reset()
        sessionName = ""
        showingSaveDialog = false
        saveError = nil
    }

    func prepareSave() {
        sessionName = defaultSessionName
        showingSaveDialog = true
    }

    func saveSession() async {
        guard let calibration = recordingService.calibration else {
            saveError = RecordingError.calibrationFailed
            return
        }

        isSaving = true
        saveError = nil

        do {
            // Process data
            let (curve, statistics) = PowerCalculation.processSensorData(
                samples: recordingService.samples,
                calibration: calibration,
                kartWeight: kartWeight
            )

            // Save to sync manager
            try await syncManager.saveSensorSession(
                name: sessionName,
                kartWeight: kartWeight,
                recordingDuration: recordingService.recordingDuration,
                calibration: calibration,
                samples: recordingService.samples,
                speedPowerCurve: curve,
                statistics: statistics,
                storeRawSamples: storeRawSamples
            )

            // Reset after save
            showingSaveDialog = false
            reset()
        } catch {
            saveError = error
        }

        isSaving = false
    }

    func cancelSave() {
        showingSaveDialog = false
        sessionName = ""
    }
}
