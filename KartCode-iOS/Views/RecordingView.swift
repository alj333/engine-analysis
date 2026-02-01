import SwiftUI

struct RecordingView: View {
    @StateObject private var recordingService = SensorRecordingService()
    @EnvironmentObject var syncManager: SyncManager

    @State private var kartWeight: Double = 180
    @State private var sessionName: String = ""
    @State private var showingSaveDialog = false
    @State private var storeRawSamples = true

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemBackground)
                    .ignoresSafeArea()

                VStack(spacing: 24) {
                    // Status card
                    statusCard

                    // Live data display
                    if recordingService.state == .recording {
                        liveDataCard
                    }

                    // Calibration progress
                    if recordingService.state == .calibratingGravity ||
                       recordingService.state == .calibratingForward {
                        calibrationCard
                    }

                    // Results preview
                    if recordingService.state == .stopped {
                        resultsPreview
                    }

                    Spacer()

                    // Control buttons
                    controlButtons
                }
                .padding()
            }
            .navigationTitle("Record")
            .sheet(isPresented: $showingSaveDialog) {
                saveDialog
            }
        }
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 12) {
            // Status indicator
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 12, height: 12)
                Text(statusText)
                    .font(.headline)
            }

            // Duration
            if recordingService.state == .recording || recordingService.state == .paused {
                Text(formatDuration(recordingService.recordingDuration))
                    .font(.system(size: 48, weight: .medium, design: .monospaced))
            }

            // Sample count
            if recordingService.samples.count > 0 {
                Text("\(recordingService.samples.count) samples")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Live Data Card

    private var liveDataCard: some View {
        HStack(spacing: 24) {
            // Speed
            VStack {
                Text(String(format: "%.1f", recordingService.liveSpeed))
                    .font(.system(size: 36, weight: .bold, design: .monospaced))
                Text("km/h")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()
                .frame(height: 50)

            // Acceleration
            VStack {
                Text(String(format: "%.2f", recordingService.liveAcceleration))
                    .font(.system(size: 36, weight: .bold, design: .monospaced))
                Text("G")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let accuracy = recordingService.gpsAccuracy {
                Divider()
                    .frame(height: 50)

                // GPS Accuracy
                VStack {
                    Text(String(format: "%.0f", accuracy))
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                    Text("m GPS")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Calibration Card

    private var calibrationCard: some View {
        VStack(spacing: 16) {
            Text(calibrationInstruction)
                .font(.headline)
                .multilineTextAlignment(.center)

            ProgressView(value: recordingService.calibrationProgress)
                .progressViewStyle(.linear)
                .tint(.orange)

            Text("\(Int(recordingService.calibrationProgress * 100))%")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Results Preview

    private var resultsPreview: some View {
        VStack(spacing: 16) {
            Text("Recording Complete")
                .font(.headline)

            HStack(spacing: 24) {
                VStack {
                    Text("\(recordingService.samples.count)")
                        .font(.title2.bold())
                    Text("Samples")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                VStack {
                    Text(formatDuration(recordingService.recordingDuration))
                        .font(.title2.bold())
                    Text("Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if let calibration = recordingService.calibration {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Quality: \(Int(calibration.qualityScore * 100))%")
                        .font(.caption)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Control Buttons

    private var controlButtons: some View {
        VStack(spacing: 12) {
            // Weight input (only in idle state)
            if recordingService.state == .idle {
                HStack {
                    Text("Kart Weight (kg)")
                    Spacer()
                    TextField("180", value: $kartWeight, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                        .keyboardType(.decimalPad)
                }
                .padding(.horizontal)
            }

            // Main action button
            Button(action: handleMainAction) {
                HStack {
                    Image(systemName: mainButtonIcon)
                    Text(mainButtonText)
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(mainButtonColor)
                .cornerRadius(16)
            }
            .disabled(recordingService.state == .calibratingGravity ||
                      recordingService.state == .calibratingForward ||
                      recordingService.state == .processing)

            // Secondary actions
            if recordingService.state == .stopped {
                HStack(spacing: 12) {
                    Button("Discard") {
                        recordingService.reset()
                    }
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)

                    Button("Save") {
                        sessionName = defaultSessionName
                        showingSaveDialog = true
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.green)
                    .cornerRadius(12)
                }
            }
        }
    }

    // MARK: - Save Dialog

    private var saveDialog: some View {
        NavigationView {
            Form {
                Section("Session Name") {
                    TextField("Name", text: $sessionName)
                }

                Section("Options") {
                    Toggle("Store Raw Samples", isOn: $storeRawSamples)

                    if storeRawSamples {
                        Text("Raw samples will be synced to cloud for later analysis")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Save Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingSaveDialog = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await saveSession()
                        }
                    }
                    .disabled(sessionName.isEmpty)
                }
            }
        }
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch recordingService.state {
        case .idle: return .gray
        case .requestingPermissions: return .orange
        case .calibratingGravity, .calibratingForward: return .yellow
        case .recording: return .red
        case .paused: return .orange
        case .stopped: return .green
        case .processing: return .blue
        case .error: return .red
        }
    }

    private var statusText: String {
        switch recordingService.state {
        case .idle: return "Ready to Record"
        case .requestingPermissions: return "Requesting Permissions..."
        case .calibratingGravity: return "Calibrating (Gravity)"
        case .calibratingForward: return "Calibrating (Forward)"
        case .recording: return "Recording"
        case .paused: return "Paused"
        case .stopped: return "Stopped"
        case .processing: return "Processing..."
        case .error: return "Error"
        }
    }

    private var calibrationInstruction: String {
        switch recordingService.state {
        case .calibratingGravity:
            return "Hold device still in recording position..."
        case .calibratingForward:
            return "Accelerate forward gently..."
        default:
            return ""
        }
    }

    private var mainButtonIcon: String {
        switch recordingService.state {
        case .idle: return "record.circle"
        case .recording: return "stop.circle"
        case .paused: return "play.circle"
        case .stopped: return "arrow.counterclockwise"
        default: return "hourglass"
        }
    }

    private var mainButtonText: String {
        switch recordingService.state {
        case .idle: return "Start Recording"
        case .recording: return "Stop"
        case .paused: return "Resume"
        case .stopped: return "New Recording"
        default: return "Please Wait..."
        }
    }

    private var mainButtonColor: Color {
        switch recordingService.state {
        case .idle: return .orange
        case .recording: return .red
        case .paused: return .green
        case .stopped: return .orange
        default: return .gray
        }
    }

    private var defaultSessionName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return "Session \(formatter.string(from: Date()))"
    }

    private func handleMainAction() {
        Task {
            switch recordingService.state {
            case .idle:
                try? await recordingService.startRecording(kartWeight: kartWeight)
            case .recording:
                recordingService.stopRecording()
            case .paused:
                recordingService.resumeRecording()
            case .stopped:
                recordingService.reset()
            default:
                break
            }
        }
    }

    private func saveSession() async {
        guard let calibration = recordingService.calibration else { return }

        // Process data
        let (curve, statistics) = PowerCalculation.processSensorData(
            samples: recordingService.samples,
            calibration: calibration,
            kartWeight: kartWeight
        )

        // Save to sync manager
        do {
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

            showingSaveDialog = false
            recordingService.reset()
        } catch {
            print("Save error: \(error)")
        }
    }

    private func formatDuration(_ ms: TimeInterval) -> String {
        let totalSeconds = Int(ms / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        let tenths = Int((ms / 100).truncatingRemainder(dividingBy: 10))
        return String(format: "%02d:%02d.%d", minutes, seconds, tenths)
    }
}

#Preview {
    RecordingView()
        .environmentObject(SyncManager.shared)
}
