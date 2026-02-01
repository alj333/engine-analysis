import SwiftUI

@main
struct KartCodeApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var syncManager = SyncManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(syncManager)
                .onAppear {
                    // Initialize services
                    Task {
                        await authManager.checkAuthStatus()
                    }
                }
        }
    }
}

// MARK: - Configuration

enum AppConfig {
    static let convexURL: String = {
        guard let url = Bundle.main.object(forInfoDictionaryKey: "CONVEX_URL") as? String,
              !url.isEmpty else {
            fatalError("CONVEX_URL not configured in Info.plist")
        }
        return url
    }()

    static let clerkPublishableKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String,
              !key.isEmpty else {
            fatalError("CLERK_PUBLISHABLE_KEY not configured in Info.plist")
        }
        return key
    }()
}
