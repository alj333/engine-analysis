import Foundation
import AuthenticationServices

/// Manages authentication with Clerk
/// Handles Sign in with Apple, Google, and email authentication
@MainActor
final class AuthManager: ObservableObject {
    // MARK: - Singleton

    static let shared = AuthManager()

    // MARK: - Published Properties

    @Published private(set) var isAuthenticated: Bool = false
    @Published private(set) var isLoading: Bool = true
    @Published private(set) var user: AuthUser?
    @Published private(set) var error: Error?

    // MARK: - Types

    struct AuthUser: Identifiable {
        let id: String
        let email: String
        let name: String?
        let imageURL: URL?
    }

    // MARK: - Private Properties

    private let convexService = ConvexService.shared
    private let keychainKey = "com.kartcode.auth-token"

    // MARK: - Initialization

    private init() {}

    // MARK: - Public Methods

    /// Check if user is already authenticated
    func checkAuthStatus() async {
        isLoading = true

        // Check for stored token
        if let token = getStoredToken() {
            await convexService.setAuthToken(token)

            // Validate token by fetching user
            do {
                // Try to get current user - if token is valid this will succeed
                isAuthenticated = true
                // TODO: Fetch user details from Clerk
            } catch {
                // Token invalid, clear it
                clearStoredToken()
                isAuthenticated = false
            }
        } else {
            isAuthenticated = false
        }

        isLoading = false
    }

    /// Sign in with Apple
    func signInWithApple() async throws {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email, .fullName]

        // Use ASAuthorizationController to handle the request
        // This requires UIKit integration which is handled in the view
    }

    /// Handle Apple Sign In result
    func handleAppleSignIn(authorization: ASAuthorization) async throws {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            throw AuthError.invalidCredential
        }

        guard let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            throw AuthError.noToken
        }

        // Exchange Apple token for Clerk session
        // This requires calling Clerk's OAuth endpoint
        try await authenticateWithClerk(provider: "apple", token: identityToken)

        // Store user info
        let email = appleIDCredential.email ?? ""
        let name = [
            appleIDCredential.fullName?.givenName,
            appleIDCredential.fullName?.familyName
        ].compactMap { $0 }.joined(separator: " ")

        user = AuthUser(
            id: appleIDCredential.user,
            email: email,
            name: name.isEmpty ? nil : name,
            imageURL: nil
        )

        isAuthenticated = true
    }

    /// Sign out
    func signOut() async {
        clearStoredToken()
        await convexService.setAuthToken(nil)
        user = nil
        isAuthenticated = false
    }

    // MARK: - Private Methods

    private func authenticateWithClerk(provider: String, token: String) async throws {
        // TODO: Implement Clerk OAuth flow
        // 1. Send token to Clerk's OAuth endpoint
        // 2. Get Clerk session token
        // 3. Store session token
        // 4. Set token for Convex

        // For now, store the Apple token directly (this should be replaced with Clerk session)
        storeToken(token)
        await convexService.setAuthToken(token)
    }

    // MARK: - Keychain

    private func storeToken(_ token: String) {
        let data = token.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey,
            kSecValueData as String: data
        ]

        // Delete existing
        SecItemDelete(query as CFDictionary)

        // Add new
        SecItemAdd(query as CFDictionary, nil)
    }

    private func getStoredToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }

        return token
    }

    private func clearStoredToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey
        ]

        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Errors

enum AuthError: LocalizedError {
    case invalidCredential
    case noToken
    case clerkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidCredential:
            return "Invalid credential"
        case .noToken:
            return "No authentication token received"
        case .clerkError(let message):
            return message
        }
    }
}
