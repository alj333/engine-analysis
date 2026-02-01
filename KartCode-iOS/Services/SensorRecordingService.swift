import Foundation
import CoreMotion
import CoreLocation
import Combine

/// Service for recording sensor data using CoreMotion and CoreLocation
/// Ported from web-app/src/hooks/useSensorRecording.ts
@MainActor
final class SensorRecordingService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published private(set) var state: RecordingState = .idle
    @Published private(set) var samples: [SensorSample] = []
    @Published private(set) var recordingDuration: TimeInterval = 0
    @Published private(set) var calibration: CalibrationData?
    @Published private(set) var calibrationProgress: Double = 0
    @Published private(set) var error: Error?

    // Live data for UI
    @Published private(set) var liveSpeed: Double = 0  // km/h
    @Published private(set) var liveAcceleration: Double = 0  // G
    @Published private(set) var gpsAccuracy: Double?

    // Permissions
    @Published private(set) var permissions = SensorPermissions(
        motion: .prompt,
        location: .prompt
    )

    // MARK: - Private Properties

    private let motionManager = CMMotionManager()
    private let locationManager = CLLocationManager()
    private var calibrationManager = CalibrationManager()

    private var recordingStartTime: Date?
    private var recordingTimer: Timer?

    private var latestLocation: CLLocation?
    private var calibrationSamples: [(x: Double, y: Double, z: Double)] = []

    // Constants
    private let sampleInterval: TimeInterval = 0.02  // 50Hz
    private let gravitySamples = 150  // ~3 seconds for gravity calibration
    private let forwardSamples = 250  // ~5 seconds for forward calibration

    // MARK: - Initialization

    override init() {
        super.init()
        locationManager.delegate = self
        checkPermissions()
    }

    // MARK: - Public Methods

    /// Start the recording process (calibration → recording)
    func startRecording(kartWeight: Double) async throws {
        guard state == .idle else {
            throw RecordingError.invalidState
        }

        state = .requestingPermissions

        // Request permissions
        try await requestPermissions()

        // Start GPS
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.startUpdatingLocation()

        // Start calibration
        state = .calibratingGravity
        calibrationProgress = 0
        calibrationSamples = []

        // Start motion updates
        motionManager.deviceMotionUpdateInterval = sampleInterval
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion else { return }
            Task { @MainActor in
                self.handleMotionUpdate(motion)
            }
        }
    }

    /// Stop recording and process results
    func stopRecording() {
        guard state == .recording || state == .paused else { return }

        state = .stopped
        recordingTimer?.invalidate()
        recordingTimer = nil
        motionManager.stopDeviceMotionUpdates()
        locationManager.stopUpdatingLocation()
    }

    /// Pause recording
    func pauseRecording() {
        guard state == .recording else { return }
        state = .paused
        recordingTimer?.invalidate()
    }

    /// Resume recording
    func resumeRecording() {
        guard state == .paused else { return }
        state = .recording
        startRecordingTimer()
    }

    /// Reset to idle state
    func reset() {
        stopRecording()
        state = .idle
        samples = []
        recordingDuration = 0
        calibration = nil
        calibrationProgress = 0
        error = nil
        calibrationSamples = []
    }

    // MARK: - Private Methods

    private func checkPermissions() {
        // Check motion permission
        if CMMotionActivityManager.isActivityAvailable() {
            // Motion is available, permission will be requested on first use
            permissions.motion = .prompt
        } else {
            permissions.motion = .notSupported
        }

        // Check location permission
        switch locationManager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            permissions.location = .granted
        case .denied, .restricted:
            permissions.location = .denied
        case .notDetermined:
            permissions.location = .prompt
        @unknown default:
            permissions.location = .prompt
        }
    }

    private func requestPermissions() async throws {
        // Request motion permission
        if !motionManager.isDeviceMotionAvailable {
            throw RecordingError.motionNotAvailable
        }

        // Request location permission
        if locationManager.authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()

            // Wait for authorization
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                var cancellable: AnyCancellable?
                cancellable = $permissions
                    .map(\.location)
                    .filter { $0 != .prompt }
                    .first()
                    .sink { status in
                        cancellable?.cancel()
                        if status == .granted {
                            continuation.resume()
                        } else {
                            continuation.resume(throwing: RecordingError.locationDenied)
                        }
                    }
            }
        } else if permissions.location == .denied {
            throw RecordingError.locationDenied
        }
    }

    private func handleMotionUpdate(_ motion: CMDeviceMotion) {
        // Get user acceleration (gravity-free)
        let accel = motion.userAcceleration

        switch state {
        case .calibratingGravity:
            handleGravityCalibration(accel: accel, gravity: motion.gravity)

        case .calibratingForward:
            handleForwardCalibration(accel: accel)

        case .recording:
            recordSample(accel: accel)

        default:
            break
        }

        // Update live acceleration display
        let totalAccel = sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z)
        liveAcceleration = totalAccel / 9.81  // Convert to G
    }

    private func handleGravityCalibration(accel: CMAcceleration, gravity: CMAcceleration) {
        calibrationSamples.append((x: gravity.x, y: gravity.y, z: gravity.z))
        calibrationProgress = Double(calibrationSamples.count) / Double(gravitySamples)

        if calibrationSamples.count >= gravitySamples {
            // Compute average gravity vector
            let avgGravity = calibrationManager.detectGravityVector(from: calibrationSamples)

            // Move to forward calibration
            calibrationSamples = []
            calibrationProgress = 0
            state = .calibratingForward
        }
    }

    private func handleForwardCalibration(accel: CMAcceleration) {
        calibrationSamples.append((x: accel.x * 9.81, y: accel.y * 9.81, z: accel.z * 9.81))
        calibrationProgress = Double(calibrationSamples.count) / Double(forwardSamples)

        if calibrationSamples.count >= forwardSamples {
            // Complete calibration
            if let cal = calibrationManager.completeCalibration(accelerationSamples: calibrationSamples) {
                calibration = cal
                calibrationSamples = []

                // Start recording
                samples = []
                recordingDuration = 0
                recordingStartTime = Date()
                state = .recording
                startRecordingTimer()
            } else {
                state = .error
                error = RecordingError.calibrationFailed
            }
        }
    }

    private func recordSample(accel: CMAcceleration) {
        guard let startTime = recordingStartTime else { return }

        let timestamp = Date().timeIntervalSince(startTime) * 1000  // ms

        // Get GPS data
        var gpsSpeed: Double?
        var gpsAccuracy: Double?
        var latitude: Double?
        var longitude: Double?

        if let location = latestLocation {
            if location.speed >= 0 {
                gpsSpeed = location.speed  // m/s
                liveSpeed = location.speed * 3.6  // km/h
            }
            gpsAccuracy = location.horizontalAccuracy
            self.gpsAccuracy = gpsAccuracy
            latitude = location.coordinate.latitude
            longitude = location.coordinate.longitude
        }

        let sample = SensorSample(
            timestamp: timestamp,
            accelX: accel.x * 9.81,  // Convert G to m/s²
            accelY: accel.y * 9.81,
            accelZ: accel.z * 9.81,
            gpsSpeed: gpsSpeed,
            gpsAccuracy: gpsAccuracy,
            latitude: latitude,
            longitude: longitude
        )

        samples.append(sample)
    }

    private func startRecordingTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.recordingStartTime else { return }
            Task { @MainActor in
                self.recordingDuration = Date().timeIntervalSince(startTime) * 1000  // ms
            }
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension SensorRecordingService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            latestLocation = locations.last
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        Task { @MainActor in
            switch status {
            case .authorizedAlways, .authorizedWhenInUse:
                permissions.location = .granted
            case .denied, .restricted:
                permissions.location = .denied
            case .notDetermined:
                permissions.location = .prompt
            @unknown default:
                permissions.location = .prompt
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.error = error
        }
    }
}

// MARK: - Errors

enum RecordingError: LocalizedError {
    case invalidState
    case motionNotAvailable
    case locationDenied
    case calibrationFailed

    var errorDescription: String? {
        switch self {
        case .invalidState:
            return "Invalid recording state"
        case .motionNotAvailable:
            return "Motion sensors not available"
        case .locationDenied:
            return "Location permission denied"
        case .calibrationFailed:
            return "Calibration failed - try again"
        }
    }
}
