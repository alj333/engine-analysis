# Engine Analysis Web App - Implementation Plan

## Overview

Build a web-based version of NT-Project's Engine Analysis software for kart racing telemetry analysis. The app will process CSV telemetry data to calculate and visualize engine power/torque curves, comparable to dynamometer testing.

---

## Technology Stack

### Frontend (Cloudflare Pages)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2 (lightweight, good performance)
- **State Management**: Zustand (simple, lightweight)
- **File Handling**: Papa Parse (CSV parsing)
- **Storage**: IndexedDB via Dexie.js (for sessions/configs)

### Backend (Optional - Cloudflare Workers)
- Only needed if you want cloud sync/sharing features
- Cloudflare KV for storing shared configurations
- For MVP, everything runs client-side

### Deployment
- Cloudflare Pages (static site hosting)
- Custom domain support included
- Automatic HTTPS

---

## Project Structure

```
engine-analysis-web/
├── public/
│   └── data/
│       ├── engines.json      # Pre-loaded engine configurations
│       ├── karts.json        # Pre-loaded kart configurations
│       ├── tyres.json        # Pre-loaded tyre configurations
│       └── channelMappings.json  # Auto-detection mappings
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainContent.tsx
│   │   ├── config/
│   │   │   ├── KartConfig.tsx
│   │   │   ├── EngineConfig.tsx
│   │   │   ├── TyreConfig.tsx
│   │   │   ├── FinalDriveConfig.tsx
│   │   │   └── RunConditions.tsx
│   │   ├── acquisition/
│   │   │   ├── FileImport.tsx
│   │   │   ├── ChannelMapping.tsx
│   │   │   ├── LapSelector.tsx
│   │   │   └── DataPreview.tsx
│   │   ├── results/
│   │   │   ├── PowerCurve.tsx
│   │   │   ├── TorqueCurve.tsx
│   │   │   ├── TemperatureCharts.tsx
│   │   │   ├── LapTelemetry.tsx
│   │   │   └── ComparisonView.tsx
│   │   └── common/
│   │       ├── NumberInput.tsx
│   │       ├── Select.tsx
│   │       ├── Slider.tsx
│   │       └── Button.tsx
│   ├── lib/
│   │   ├── analysis/
│   │   │   ├── powerCalculation.ts    # Core physics engine
│   │   │   ├── dataFiltering.ts       # Signal smoothing
│   │   │   ├── gearDetection.ts       # Auto gear detection
│   │   │   ├── rpmBinning.ts          # RPM averaging
│   │   │   └── environmentCorrection.ts
│   │   ├── parsers/
│   │   │   ├── csvParser.ts           # Generic CSV
│   │   │   ├── aimParser.ts           # AIM format
│   │   │   ├── unipro Parser.ts       # UNIPRO format
│   │   │   └── channelDetector.ts     # Auto-detect channels
│   │   ├── storage/
│   │   │   ├── db.ts                  # IndexedDB setup
│   │   │   ├── sessions.ts            # Session CRUD
│   │   │   └── customConfigs.ts       # User configs
│   │   └── export/
│   │       ├── csvExport.ts
│   │       ├── pdfExport.ts
│   │       └── enaExport.ts           # Compatible format
│   ├── stores/
│   │   ├── configStore.ts             # Kart/engine/tyre state
│   │   ├── acquisitionStore.ts        # Imported data state
│   │   ├── resultsStore.ts            # Calculation results
│   │   └── comparisonStore.ts         # Comparison state
│   ├── types/
│   │   ├── config.ts
│   │   ├── telemetry.ts
│   │   └── results.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── wrangler.toml                      # Cloudflare config
```

---

## Phase 1: Core Infrastructure (Week 1)

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up ESLint and Prettier
- [ ] Create basic layout components
- [ ] Configure Cloudflare Pages deployment

### 1.2 Data Conversion
Convert existing `.cbd` configuration files to JSON:

```typescript
// engines.json structure
{
  "engines": [
    {
      "id": "kz-tm-kz10c",
      "name": "KZ - TM KZ10C",
      "category": "KZ",
      "inertia": 0.0037986,  // kgm²
      "gearbox": {
        "primary": { "input": 19, "output": 75 },
        "gears": [
          { "input": 13, "output": 33 },
          { "input": 16, "output": 29 },
          { "input": 18, "output": 27 },
          { "input": 22, "output": 27 },
          { "input": 22, "output": 23 },
          { "input": 27, "output": 25 }
        ]
      }
    }
    // ... 56 more engines
  ]
}

// karts.json structure
{
  "karts": [
    {
      "id": "kz2",
      "name": "KZ2",
      "weight": 175,           // kg (with driver)
      "frontalArea": 0.5603,   // m²
      "dragCoefficient": 0.89
    }
    // ... 35 more karts
  ]
}

// tyres.json structure
{
  "tyres": [
    {
      "id": "vega-xm-mag",
      "name": "Vega XM - Magnesio",
      "diameter": 279.4,       // mm
      "inertia": 0.0267,       // kgm²
      "rollingCoeff1": 0.032,
      "rollingCoeff2": 9.5e-6,
      "rimType": "magnesium"
    }
    // ... 49 more tyres
  ]
}
```

### 1.3 Storage Setup
```typescript
// src/lib/storage/db.ts
import Dexie from 'dexie';

export class EngineAnalysisDB extends Dexie {
  sessions!: Table<Session>;
  customEngines!: Table<Engine>;
  customKarts!: Table<Kart>;
  customTyres!: Table<Tyre>;

  constructor() {
    super('EngineAnalysisDB');
    this.version(1).stores({
      sessions: '++id, name, createdAt',
      customEngines: '++id, name',
      customKarts: '++id, name',
      customTyres: '++id, name'
    });
  }
}

export const db = new EngineAnalysisDB();
```

---

## Phase 2: Configuration UI (Week 2)

### 2.1 Kart Configuration Panel
- Dropdown to select from 36 pre-loaded kart categories
- Manual override fields:
  - Total weight (kg)
  - Frontal area (m²)
  - Drag coefficient
- "Save Custom" functionality

### 2.2 Engine Configuration Panel
- Dropdown to select from 57 pre-loaded engines
- Fields:
  - Engine inertia (kgm²)
  - Primary gear ratio (input/output teeth)
  - Gearbox ratios (1st through 7th, optional)
- "Save Custom" functionality

### 2.3 Final Drive Configuration
- Front sprocket teeth (number input)
- Rear sprocket teeth (number input)

### 2.4 Tyre Configuration Panel
- Dropdown to select from 50 pre-loaded tyres
- Manual override fields:
  - Diameter (mm)
  - Inertia (kgm²)
  - Rolling coefficient 1
  - Rolling coefficient 2

### 2.5 Run Conditions Panel
- Pressure (mbar)
- Temperature (°C)
- Humidity (%)
- Track grip (slider: low to high)

---

## Phase 3: Data Acquisition (Week 3)

### 3.1 CSV Import
```typescript
// src/lib/parsers/csvParser.ts
import Papa from 'papaparse';

export interface TelemetryData {
  time: number[];
  distance: number[];
  rpm: number[];
  speed: number[];        // GPS speed in km/h
  latAcc: number[];       // Lateral acceleration (g)
  lonAcc: number[];       // Longitudinal acceleration (g)
  tempHead?: number[];
  tempCool?: number[];
  tempExhaust?: number[];
  lambda?: number[];
  lapMarkers: number[];   // Indices where new laps start
}

export async function parseCSV(file: File): Promise<{
  data: TelemetryData;
  headers: string[];
  metadata: Record<string, string>;
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        // Parse AIM CSV format (detect from header)
        // Extract metadata (venue, date, sample rate, etc.)
        // Map columns to TelemetryData structure
        resolve(processResults(results));
      },
      error: reject
    });
  });
}
```

### 3.2 Channel Auto-Detection
```typescript
// src/lib/parsers/channelDetector.ts
const CHANNEL_MAPPINGS = {
  time: ['Time', 'time', 'Time(sec)', 'Time_s', 'RunningLapTime'],
  speed: ['GPS_Speed', 'Speed', 'SpeedGPS', 'GPS Speed', 'SPEEDG_Kph', 'V_Front'],
  rpm: ['RPM', 'Engine', 'Rpm', 'rpm', 'engine speed', 'XKart RPM[rpm]'],
  latAcc: ['GPS_LatAcc', 'A. Lat.', 'Ay', 'acc_lat', 'GX[G]'],
  lonAcc: ['GPS_LonAcc', 'A. Long.', 'Ax', 'acc_lon', 'GY[G]'],
  // ... etc
};

export function detectChannels(headers: string[]): ChannelMapping {
  const mapping: ChannelMapping = {};

  for (const [channel, aliases] of Object.entries(CHANNEL_MAPPINGS)) {
    const found = headers.find(h =>
      aliases.some(alias => h.toLowerCase().includes(alias.toLowerCase()))
    );
    if (found) {
      mapping[channel] = { header: found, status: 'matched' };
    } else {
      mapping[channel] = { header: null, status: 'unmatched' };
    }
  }

  return mapping;
}
```

### 3.3 Lap Selection UI
- Display list of laps with lap times
- Checkbox selection (recommend 5-6 best laps)
- Visual indicator for out-lap (first lap)
- Data filtering slider

---

## Phase 4: Core Analysis Engine (Week 4)

### 4.1 Power Calculation
```typescript
// src/lib/analysis/powerCalculation.ts

export interface AnalysisConfig {
  kart: {
    totalWeight: number;      // kg
    frontalArea: number;      // m²
    dragCoefficient: number;
  };
  engine: {
    inertia: number;          // kgm²
    primaryRatio: number;
    gearRatios: number[];
  };
  finalDrive: {
    frontSprocket: number;
    rearSprocket: number;
  };
  tyre: {
    diameter: number;         // mm
    inertia: number;          // kgm²
    rollingCoeff1: number;
    rollingCoeff2: number;
  };
  environment: {
    pressure: number;         // mbar
    temperature: number;      // °C
    humidity: number;         // %
    trackGrip: number;        // 0-1
  };
}

export interface PowerResult {
  rpm: number;
  speed: number;              // m/s
  power: number;              // CV (horsepower)
  torque: number;             // N*m
  tempHead: number;
  tempCool: number;
  tempExhaust: number;
  lambda: number;
}

export function calculatePower(
  telemetry: TelemetryData,
  config: AnalysisConfig,
  selectedLaps: number[]
): PowerResult[] {
  const results: PowerResult[] = [];
  const wheelRadius = config.tyre.diameter / 2000; // Convert mm to m

  // Final drive ratio
  const finalRatio = config.finalDrive.rearSprocket / config.finalDrive.frontSprocket;

  // Air density correction
  const airDensity = calculateAirDensity(
    config.environment.pressure,
    config.environment.temperature,
    config.environment.humidity
  );

  // Process each data point in selected laps
  for (const lapIndex of selectedLaps) {
    const lapData = extractLapData(telemetry, lapIndex);

    for (let i = 0; i < lapData.time.length; i++) {
      const speed = lapData.speed[i] / 3.6;  // km/h to m/s
      const rpm = lapData.rpm[i];
      const lonAcc = lapData.lonAcc[i] * 9.81;  // g to m/s²

      if (speed < 5 || lonAcc <= 0) continue;  // Skip low speed / braking

      // Detect current gear from RPM/speed relationship
      const gear = detectGear(rpm, speed, wheelRadius, finalRatio, config.engine);
      if (gear === 0) continue;

      const gearRatio = config.engine.gearRatios[gear - 1] || 1;
      const totalRatio = config.engine.primaryRatio * gearRatio * finalRatio;

      // Calculate forces
      const dragForce = 0.5 * airDensity * config.kart.frontalArea *
                        config.kart.dragCoefficient * speed * speed;

      const rollingResistance = config.kart.totalWeight * 9.81 *
                                (config.tyre.rollingCoeff1 +
                                 config.tyre.rollingCoeff2 * speed * speed);

      // Inertial forces (linear + rotational)
      const linearInertia = config.kart.totalWeight * lonAcc;
      const wheelInertia = 2 * config.tyre.inertia * lonAcc / wheelRadius;
      const engineInertia = config.engine.inertia * totalRatio * totalRatio *
                           lonAcc / wheelRadius;

      // Total wheel force
      const wheelForce = linearInertia + dragForce + rollingResistance +
                        wheelInertia + engineInertia;

      // Wheel power (W)
      const wheelPowerW = wheelForce * speed;

      // Convert to CV (1 CV = 735.5 W)
      const wheelPowerCV = wheelPowerW / 735.5;

      // Wheel torque
      const wheelTorque = wheelForce * wheelRadius;

      results.push({
        rpm,
        speed,
        power: wheelPowerCV,
        torque: wheelTorque,
        tempHead: lapData.tempHead?.[i] || 0,
        tempCool: lapData.tempCool?.[i] || 0,
        tempExhaust: lapData.tempExhaust?.[i] || 0,
        lambda: lapData.lambda?.[i] || 0
      });
    }
  }

  return results;
}
```

### 4.2 RPM Binning
```typescript
// src/lib/analysis/rpmBinning.ts

export interface BinnedResult {
  rpm: number;
  avgSpeed: number;
  avgPower: number;
  avgTorque: number;
  avgTempHead: number;
  avgTempCool: number;
  avgTempExhaust: number;
  avgLambda: number;
  sampleCount: number;
}

export function binByRPM(
  results: PowerResult[],
  minRPM: number,
  maxRPM: number,
  binSize: number = 100
): BinnedResult[] {
  const bins = new Map<number, PowerResult[]>();

  // Group results into RPM bins
  for (const result of results) {
    if (result.rpm < minRPM || result.rpm > maxRPM) continue;

    const binKey = Math.floor(result.rpm / binSize) * binSize;
    if (!bins.has(binKey)) {
      bins.set(binKey, []);
    }
    bins.get(binKey)!.push(result);
  }

  // Calculate averages for each bin
  const binnedResults: BinnedResult[] = [];

  for (const [rpm, samples] of bins.entries()) {
    if (samples.length < 3) continue;  // Need minimum samples

    binnedResults.push({
      rpm,
      avgSpeed: average(samples.map(s => s.speed)),
      avgPower: average(samples.map(s => s.power)),
      avgTorque: average(samples.map(s => s.torque)),
      avgTempHead: average(samples.map(s => s.tempHead)),
      avgTempCool: average(samples.map(s => s.tempCool)),
      avgTempExhaust: average(samples.map(s => s.tempExhaust)),
      avgLambda: average(samples.map(s => s.lambda)),
      sampleCount: samples.length
    });
  }

  return binnedResults.sort((a, b) => a.rpm - b.rpm);
}
```

### 4.3 Data Filtering/Smoothing
```typescript
// src/lib/analysis/dataFiltering.ts

// Moving average filter
export function movingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data.slice(start, end);
    result.push(average(window));
  }

  return result;
}

// Savitzky-Golay filter for smoother curves
export function savitzkyGolay(
  data: number[],
  windowSize: number = 5,
  polynomial: number = 2
): number[] {
  // Implementation of Savitzky-Golay smoothing
  // Good for preserving peaks while removing noise
  // ...
}
```

### 4.4 Gear Detection
```typescript
// src/lib/analysis/gearDetection.ts

export function detectGear(
  rpm: number,
  speed: number,          // m/s
  wheelRadius: number,    // m
  finalRatio: number,
  engine: EngineConfig
): number {
  const wheelAngularVelocity = speed / wheelRadius;  // rad/s
  const engineAngularVelocity = (rpm * Math.PI) / 30;  // rad/s

  const observedRatio = engineAngularVelocity / wheelAngularVelocity;
  const expectedPrimaryRatio = engine.primaryRatio * finalRatio;

  // Find closest matching gear
  for (let gear = 1; gear <= engine.gearRatios.length; gear++) {
    const expectedRatio = expectedPrimaryRatio * engine.gearRatios[gear - 1];
    const error = Math.abs(observedRatio - expectedRatio) / expectedRatio;

    if (error < 0.05) {  // 5% tolerance
      return gear;
    }
  }

  return 0;  // Unable to detect gear
}
```

---

## Phase 5: Visualization (Week 5)

### 5.1 Power Curve Chart
```typescript
// src/components/results/PowerCurve.tsx
import { Line } from 'react-chartjs-2';

export function PowerCurve({ data, comparison }: PowerCurveProps) {
  const chartData = {
    labels: data.map(d => d.rpm),
    datasets: [
      {
        label: 'Wheel Power (CV)',
        data: data.map(d => d.avgPower),
        borderColor: 'rgb(255, 0, 0)',
        tension: 0.3
      },
      ...(comparison ? [{
        label: 'Comparison (CV)',
        data: comparison.map(d => d.avgPower),
        borderColor: 'rgb(0, 0, 255)',
        tension: 0.3
      }] : [])
    ]
  };

  return (
    <Line
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          title: { display: true, text: 'Wheel Power' }
        },
        scales: {
          x: { title: { display: true, text: 'RPM' } },
          y: { title: { display: true, text: 'CV' } }
        }
      }}
    />
  );
}
```

### 5.2 Chart Types Required
1. **Power vs RPM** (primary output)
2. **Torque vs RPM**
3. **Head Temperature vs RPM**
4. **Water Temperature vs RPM**
5. **Exhaust Temperature vs RPM**
6. **Lambda vs RPM**
7. **Gear Engaged vs Time** (lap view)
8. **Throttle vs Time** (lap view)
9. **Speed vs Time** (lap view)
10. **RPM vs Time** (lap view)
11. **Acceleration vs Time** (lap view)
12. **Power vs Time** (lap view)

### 5.3 Comparison Mode
- Load two saved sessions
- Overlay charts with different colors (red = File 1, blue = File 2)
- Toggle individual datasets on/off

---

## Phase 6: Session Management (Week 6)

### 6.1 Save Session
```typescript
interface Session {
  id?: number;
  name: string;
  createdAt: Date;
  config: AnalysisConfig;
  sourceFile: string;
  selectedLaps: number[];
  channelMapping: ChannelMapping;
  results: BinnedResult[];
  telemetryResults: TelemetryResult[];
}

export async function saveSession(session: Session): Promise<number> {
  return await db.sessions.add(session);
}
```

### 6.2 Load Session
- Display list of saved sessions
- Load configuration and results instantly
- Option to re-analyze with different settings

### 6.3 Export Options
- **CSV Export**: Power curve data (RPM, Power, Torque, Temps)
- **PDF Export**: Charts and summary (using jsPDF)
- **.ena Export**: Compatible with original software format

---

## Phase 7: Polish & PWA (Week 7)

### 7.1 Progressive Web App
```json
// public/manifest.json
{
  "name": "Engine Analysis",
  "short_name": "EngineAnalysis",
  "description": "Kart racing engine telemetry analysis",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 7.2 Offline Support
- Service worker for caching static assets
- IndexedDB for all user data
- Works fully offline after first load

### 7.3 UI Polish
- Responsive design (tablet-friendly for trackside use)
- Dark/light theme toggle
- Loading states and progress indicators
- Error handling with helpful messages
- Keyboard shortcuts

---

## Cloudflare Deployment

### Setup Commands
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Initialize project
wrangler pages project create engine-analysis

# Deploy
npm run build
wrangler pages deploy dist
```

### wrangler.toml
```toml
name = "engine-analysis"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

### GitHub Integration (Recommended)
1. Connect GitHub repo to Cloudflare Pages
2. Auto-deploy on push to main branch
3. Preview deployments for PRs

---

## Data Migration Script

Script to convert existing .cbd files to JSON:

```typescript
// scripts/convertConfigs.ts
import * as fs from 'fs';
import * as path from 'path';

function parseCBD(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('"'))
    .map(line => line.replace(/^"|"$/g, ''));
}

function convertEngines(engineDir: string): Engine[] {
  const engines: Engine[] = [];

  for (const file of fs.readdirSync(engineDir)) {
    if (!file.endsWith('.cbd')) continue;

    const content = fs.readFileSync(path.join(engineDir, file), 'utf8');
    const values = parseCBD(content);

    engines.push({
      id: file.replace('.cbd', '').toLowerCase().replace(/ /g, '-'),
      name: file.replace('.cbd', ''),
      inertia: parseFloat(values[0]),
      gearbox: {
        primary: { input: parseInt(values[1]), output: parseInt(values[2]) },
        gears: [
          { input: parseInt(values[3]), output: parseInt(values[4]) },
          { input: parseInt(values[5]), output: parseInt(values[6]) },
          // ... etc
        ].filter(g => g.input && g.output)
      }
    });
  }

  return engines;
}

// Run conversion
const engines = convertEngines('./engine');
fs.writeFileSync('./public/data/engines.json', JSON.stringify({ engines }, null, 2));
```

---

## Summary of Key Features

| Feature | Original App | Web Version |
|---------|-------------|-------------|
| CSV Import | AIM, UNIPRO, ALFANO, Cosworth | Same (all via CSV) |
| Channel Auto-Detection | Yes | Yes |
| Pre-loaded Configs | 57 engines, 36 karts, 50 tyres | Same (JSON) |
| Custom Configs | Save to .cbd files | Save to IndexedDB |
| Power/Torque Curves | Yes | Yes (Chart.js) |
| Temperature Analysis | Yes | Yes |
| Lap Telemetry | Yes | Yes |
| Session Comparison | Yes (File 1 vs File 2) | Yes |
| Export Formats | .out, .tel, .cbd, print | CSV, PDF, .ena |
| Offline Support | Native app | PWA |
| Platform | Windows only | Any browser (Mac, Windows, iOS, Android) |

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Core Infrastructure | 5 days | Project setup, data conversion, storage |
| 2. Configuration UI | 5 days | All config panels working |
| 3. Data Acquisition | 5 days | CSV import, channel mapping, lap selection |
| 4. Analysis Engine | 7 days | Power calculation, binning, filtering |
| 5. Visualization | 5 days | All charts implemented |
| 6. Session Management | 3 days | Save/load/export |
| 7. Polish & PWA | 5 days | Offline support, responsive design |

**Total: ~5 weeks** for a fully functional web app
