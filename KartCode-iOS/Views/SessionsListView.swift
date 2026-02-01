import SwiftUI

struct SessionsListView: View {
    @EnvironmentObject var syncManager: SyncManager

    @State private var sessions: [ConvexSensorSession] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var selectedSession: ConvexSensorSession?

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error = error {
                    errorView(error)
                } else if sessions.isEmpty {
                    emptyView
                } else {
                    sessionsList
                }
            }
            .navigationTitle("Sessions")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task {
                            await loadSessions()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .task {
            await loadSessions()
        }
        .sheet(item: $selectedSession) { session in
            SessionDetailView(session: session)
        }
    }

    // MARK: - Subviews

    private var sessionsList: some View {
        List {
            ForEach(sessions) { session in
                SessionRow(session: session)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedSession = session
                    }
            }
            .onDelete(perform: deleteSessions)
        }
        .listStyle(.insetGrouped)
        .refreshable {
            await loadSessions()
        }
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.path.ecg")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("No Sessions Yet")
                .font(.title2)
                .fontWeight(.medium)

            Text("Record a session to see it here")
                .foregroundColor(.secondary)
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            Text("Failed to Load")
                .font(.title2)
                .fontWeight(.medium)

            Text(error.localizedDescription)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Retry") {
                Task {
                    await loadSessions()
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Actions

    private func loadSessions() async {
        isLoading = true
        error = nil

        do {
            sessions = try await syncManager.fetchRemoteSessions()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    private func deleteSessions(at offsets: IndexSet) {
        // TODO: Implement delete
    }
}

// MARK: - Session Row

struct SessionRow: View {
    let session: ConvexSensorSession

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.name)
                    .font(.headline)

                HStack(spacing: 8) {
                    Label(
                        formatDate(session.createdAt),
                        systemImage: "calendar"
                    )

                    Label(
                        formatDuration(session.recordingDuration),
                        systemImage: "timer"
                    )
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.1f CV", session.statistics.peakPower))
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.orange)

                Text(String(format: "@ %.0f km/h", session.statistics.peakPowerSpeed))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }

    private func formatDuration(_ ms: TimeInterval) -> String {
        let totalSeconds = Int(ms / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Session Detail View

struct SessionDetailView: View {
    let session: ConvexSensorSession
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Statistics cards
                    statisticsSection

                    // Power curve chart placeholder
                    powerCurveSection

                    // Session info
                    infoSection
                }
                .padding()
            }
            .navigationTitle(session.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var statisticsSection: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            StatCard(
                title: "Peak Power",
                value: String(format: "%.1f", session.statistics.peakPower),
                unit: "CV",
                icon: "bolt.fill",
                color: .orange
            )

            StatCard(
                title: "Peak Speed",
                value: String(format: "%.0f", session.statistics.maxSpeed),
                unit: "km/h",
                icon: "speedometer",
                color: .blue
            )

            StatCard(
                title: "Max Accel",
                value: String(format: "%.2f", session.statistics.maxAcceleration),
                unit: "G",
                icon: "arrow.up.right",
                color: .green
            )

            StatCard(
                title: "Max Braking",
                value: String(format: "%.2f", session.statistics.maxDeceleration),
                unit: "G",
                icon: "arrow.down.right",
                color: .red
            )
        }
    }

    private var powerCurveSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Power Curve")
                .font(.headline)

            // Placeholder for chart
            if !session.speedPowerCurve.isEmpty {
                SimplePowerChart(data: session.speedPowerCurve)
                    .frame(height: 200)
            } else {
                Text("No power curve data")
                    .foregroundColor(.secondary)
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
            }
        }
    }

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Session Info")
                .font(.headline)

            VStack(spacing: 8) {
                InfoRow(label: "Kart Weight", value: "\(Int(session.kartWeight)) kg")
                InfoRow(label: "Duration", value: formatDuration(session.recordingDuration))
                InfoRow(label: "Total Samples", value: "\(session.statistics.totalSamples)")
                InfoRow(label: "Valid GPS Samples", value: "\(session.statistics.validSpeedSamples)")
                InfoRow(label: "Has Raw Data", value: session.hasRawSamples ? "Yes" : "No")
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }

    private func formatDuration(_ ms: TimeInterval) -> String {
        let totalSeconds = Int(ms / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Helper Views

struct StatCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack(alignment: .lastTextBaseline, spacing: 4) {
                Text(value)
                    .font(.title)
                    .fontWeight(.bold)
                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
        }
    }
}

// MARK: - Simple Power Chart

struct SimplePowerChart: View {
    let data: [SpeedPowerPoint]

    var body: some View {
        GeometryReader { geometry in
            let maxPower = data.map(\.avgPower).max() ?? 1
            let maxSpeed = data.map(\.speedKmh).max() ?? 1
            let minSpeed = data.map(\.speedKmh).min() ?? 0

            ZStack {
                // Background
                Color(.secondarySystemBackground)
                    .cornerRadius(12)

                // Grid lines
                VStack(spacing: 0) {
                    ForEach(0..<5) { _ in
                        Divider()
                        Spacer()
                    }
                }
                .padding()

                // Power curve
                Path { path in
                    for (index, point) in data.enumerated() {
                        let x = (point.speedKmh - minSpeed) / (maxSpeed - minSpeed) * (geometry.size.width - 40) + 20
                        let y = geometry.size.height - 20 - (point.avgPower / maxPower * (geometry.size.height - 40))

                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(Color.orange, lineWidth: 2)

                // Data points
                ForEach(data) { point in
                    let x = (point.speedKmh - minSpeed) / (maxSpeed - minSpeed) * (geometry.size.width - 40) + 20
                    let y = geometry.size.height - 20 - (point.avgPower / maxPower * (geometry.size.height - 40))

                    Circle()
                        .fill(Color.orange)
                        .frame(width: 6, height: 6)
                        .position(x: x, y: y)
                }
            }
        }
    }
}

#Preview {
    SessionsListView()
        .environmentObject(SyncManager.shared)
}
