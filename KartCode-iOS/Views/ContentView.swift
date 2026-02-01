import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var syncManager: SyncManager

    @State private var selectedTab = 0

    var body: some View {
        Group {
            if authManager.isLoading {
                // Loading state
                ProgressView()
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
            } else if !authManager.isAuthenticated {
                // Not authenticated - show login
                AuthView()
            } else {
                // Authenticated - show main app
                TabView(selection: $selectedTab) {
                    RecordingView()
                        .tabItem {
                            Label("Record", systemImage: "waveform")
                        }
                        .tag(0)

                    SessionsListView()
                        .tabItem {
                            Label("Sessions", systemImage: "list.bullet")
                        }
                        .tag(1)

                    SettingsView()
                        .tabItem {
                            Label("Settings", systemImage: "gear")
                        }
                        .tag(2)
                }
                .accentColor(.orange)
            }
        }
    }
}

// MARK: - Settings View (placeholder)

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var syncManager: SyncManager

    var body: some View {
        NavigationView {
            List {
                // User section
                if let user = authManager.user {
                    Section("Account") {
                        HStack {
                            if let imageURL = user.imageURL {
                                AsyncImage(url: imageURL) { image in
                                    image.resizable()
                                } placeholder: {
                                    Image(systemName: "person.circle.fill")
                                        .resizable()
                                }
                                .frame(width: 50, height: 50)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.circle.fill")
                                    .resizable()
                                    .frame(width: 50, height: 50)
                                    .foregroundColor(.orange)
                            }

                            VStack(alignment: .leading) {
                                Text(user.name ?? "User")
                                    .font(.headline)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                // Sync section
                Section("Sync") {
                    HStack {
                        Text("Status")
                        Spacer()
                        HStack(spacing: 4) {
                            Circle()
                                .fill(syncStatusColor)
                                .frame(width: 8, height: 8)
                            Text(syncManager.syncStatus.rawValue.capitalized)
                                .foregroundColor(.secondary)
                        }
                    }

                    if syncManager.pendingCount > 0 {
                        HStack {
                            Text("Pending")
                            Spacer()
                            Text("\(syncManager.pendingCount)")
                                .foregroundColor(.secondary)
                        }
                    }

                    if let lastSync = syncManager.lastSyncDate {
                        HStack {
                            Text("Last Sync")
                            Spacer()
                            Text(lastSync, style: .relative)
                                .foregroundColor(.secondary)
                        }
                    }

                    Button("Sync Now") {
                        Task {
                            await syncManager.syncPendingSessions()
                        }
                    }
                    .disabled(syncManager.syncStatus == .syncing)
                }

                // Sign out
                Section {
                    Button("Sign Out", role: .destructive) {
                        Task {
                            await authManager.signOut()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }

    private var syncStatusColor: Color {
        switch syncManager.syncStatus {
        case .idle: return .green
        case .syncing: return .orange
        case .error: return .red
        case .offline: return .gray
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager.shared)
        .environmentObject(SyncManager.shared)
}
