import SwiftUI
import AuthenticationServices

struct AuthView: View {
    @EnvironmentObject var authManager: AuthManager

    @State private var isSigningIn = false
    @State private var error: Error?

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.15),
                    Color(red: 0.05, green: 0.05, blue: 0.1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                // Logo and branding
                VStack(spacing: 16) {
                    Image(systemName: "gauge.with.needle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.orange)

                    Text("Kart-Code")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Engine Analysis")
                        .font(.title3)
                        .foregroundColor(.gray)
                }

                // Features
                VStack(alignment: .leading, spacing: 16) {
                    FeatureRow(
                        icon: "waveform.path.ecg",
                        title: "Sensor Recording",
                        description: "Capture acceleration and GPS data"
                    )

                    FeatureRow(
                        icon: "icloud.fill",
                        title: "Cloud Sync",
                        description: "Access sessions on any device"
                    )

                    FeatureRow(
                        icon: "chart.line.uptrend.xyaxis",
                        title: "Power Analysis",
                        description: "Calculate power curves from sensor data"
                    )
                }
                .padding(.horizontal)

                Spacer()

                // Sign in buttons
                VStack(spacing: 16) {
                    // Sign in with Apple
                    SignInWithAppleButton(
                        .signIn,
                        onRequest: { request in
                            request.requestedScopes = [.email, .fullName]
                        },
                        onCompletion: { result in
                            handleAppleSignIn(result)
                        }
                    )
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 50)
                    .cornerRadius(12)

                    // Skip for now
                    Button("Continue without account") {
                        // Allow local-only usage
                    }
                    .font(.subheadline)
                    .foregroundColor(.gray)
                }
                .padding(.horizontal)
                .padding(.bottom, 40)
            }

            // Loading overlay
            if isSigningIn {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()

                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
            }
        }
        .alert("Sign In Error", isPresented: .init(
            get: { error != nil },
            set: { if !$0 { error = nil } }
        )) {
            Button("OK") {
                error = nil
            }
        } message: {
            if let error = error {
                Text(error.localizedDescription)
            }
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            isSigningIn = true
            Task {
                do {
                    try await authManager.handleAppleSignIn(authorization: authorization)
                } catch {
                    self.error = error
                }
                isSigningIn = false
            }
        case .failure(let error):
            self.error = error
        }
    }
}

// MARK: - Feature Row

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.orange)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
        }
    }
}

#Preview {
    AuthView()
        .environmentObject(AuthManager.shared)
}
