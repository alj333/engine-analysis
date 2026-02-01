# Kart-Code iOS App

Native iOS companion app for the Kart-Code Engine Analysis tool. Record sensor data using your iPhone's accelerometer and GPS, sync to the cloud, and view power curves.

## Features

- **Sensor Recording**: Capture accelerometer and GPS data at 50Hz
- **Calibration**: Automatic coordinate transformation from device to kart orientation
- **Power Calculation**: Calculate power-speed curves from acceleration data
- **Cloud Sync**: Sync sessions to Convex backend for cross-device access
- **Sign in with Apple**: Secure authentication via Clerk

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/engine-analysis.git
cd engine-analysis/KartCode-iOS
```

### 2. Configure API keys

Copy the configuration template:

```bash
cp Config.xcconfig Config.local.xcconfig
```

Edit `Config.local.xcconfig` with your API keys:

```
CLERK_PUBLISHABLE_KEY = pk_test_YOUR_CLERK_KEY
CONVEX_URL = https://your-deployment.convex.cloud
```

### 3. Open in Xcode

```bash
open KartCode-iOS.xcodeproj
```

Or create a new Xcode project and add the source files.

### 4. Build and run

Select your device or simulator and press Cmd+R to build and run.

## Project Structure

```
KartCode-iOS/
├── KartCodeApp.swift           # App entry point
├── Models/
│   ├── SensorModels.swift      # Local data models (SwiftData)
│   └── ConvexModels.swift      # API response models
├── Services/
│   ├── SensorRecordingService.swift  # CoreMotion + CoreLocation
│   ├── CalibrationManager.swift      # Coordinate transformation
│   ├── PowerCalculation.swift        # Power curve calculation
│   ├── ConvexService.swift           # HTTP API client
│   ├── SyncManager.swift             # Offline sync
│   └── AuthManager.swift             # Clerk authentication
├── Views/
│   ├── ContentView.swift       # Tab navigation
│   ├── RecordingView.swift     # Sensor recording UI
│   ├── SessionsListView.swift  # Sessions list
│   └── AuthView.swift          # Sign in UI
├── ViewModels/
│   ├── RecordingViewModel.swift
│   └── SessionsViewModel.swift
├── Config.xcconfig             # Build configuration template
└── Info.plist                  # App configuration
```

## Recording Flow

1. **Start Recording**: User enters kart weight and taps "Start"
2. **Gravity Calibration**: Hold device still for 3 seconds
3. **Forward Calibration**: Accelerate forward gently for 5 seconds
4. **Recording**: Capture sensor data until user stops
5. **Processing**: Calculate power curve from acceleration data
6. **Save**: Store locally and sync to cloud

## Syncing

Sessions are stored locally using SwiftData and synced to Convex when online:

- **Create**: Sessions are saved locally first, then uploaded
- **Offline Queue**: Failed uploads are retried automatically
- **Background Sync**: Uses BGTaskScheduler for background uploads
- **Chunked Upload**: Large sample arrays are split into 1000-sample chunks

## Authentication

Uses Clerk for authentication with Sign in with Apple support:

1. User signs in with Apple ID
2. Clerk validates and creates session
3. JWT token stored in Keychain
4. Token sent with all Convex API requests

## Power Calculation

The power calculation follows this formula:

```
P = F × v

where:
F = m × a + F_drag
F_drag = 0.5 × ρ × Cd × A × v²

P = power (W)
m = kart mass (kg)
a = forward acceleration (m/s²)
v = velocity (m/s)
ρ = air density (1.225 kg/m³)
Cd × A = drag coefficient × frontal area (0.245 m²)
```

Results are binned by speed (5 km/h bins) and converted to CV (1 CV = 735.5 W).

## Permissions Required

- **Motion**: Access to accelerometer for acceleration data
- **Location**: GPS access for speed data (when in use)
- **Background Location**: Optional, for recording while screen is off

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.
