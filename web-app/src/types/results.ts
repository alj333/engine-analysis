// Individual power calculation result (per data point)
export interface PowerDataPoint {
  rpm: number;
  speed: number;            // m/s
  power: number;            // CV (horsepower)
  torque: number;           // N*m
  gear: number;             // detected gear (1-7, 0 = unknown)
  tempHead: number;         // °C
  tempCool: number;         // °C
  tempExhaust: number;      // °C
  lambda: number;
}

// Binned/averaged result by RPM
export interface BinnedResult {
  rpm: number;              // bin center RPM
  avgSpeed: number;         // m/s
  avgPower: number;         // CV
  avgTorque: number;        // N*m
  avgTempHead: number;      // °C
  avgTempCool: number;      // °C
  avgTempExhaust: number;   // °C
  avgLambda: number;
  sampleCount: number;      // number of samples in this bin
}

// Telemetry result for lap visualization (time-based)
export interface LapTelemetryResult {
  time: number;             // seconds from lap start
  speed: number;            // m/s
  speedKmh: number;         // km/h
  rpm: number;
  lonAcc: number;           // m/s²
  gear: number;
  power: number;            // CV
  throttle: number;         // %
  tempHead: number;
  tempCool: number;
  tempExhaust: number;
  lambda: number;
}

// Complete analysis results
export interface AnalysisResults {
  // Power curve data (binned by RPM)
  powerCurve: BinnedResult[];

  // Peak values
  peakPower: {
    value: number;          // CV
    rpm: number;
  };
  peakTorque: {
    value: number;          // N*m
    rpm: number;
  };

  // Lap telemetry (for selected lap visualization)
  lapTelemetry: LapTelemetryResult[];
  selectedLapIndex: number;

  // Analysis metadata
  analyzedLaps: number[];
  totalSamples: number;
  analysisDate: Date;
}

// Session storage format
export interface Session {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  // Configuration used
  kartId: string;
  kartCustom?: Partial<import('./config').Kart>;
  engineId: string;
  engineCustom?: Partial<import('./config').Engine>;
  tyreId: string;
  tyreCustom?: Partial<import('./config').Tyre>;
  finalDrive: import('./config').FinalDrive;
  runConditions: import('./config').RunConditions;

  // Source data info
  sourceFileName: string;
  selectedLaps: number[];
  channelMapping: import('./telemetry').ChannelMapping;
  filterLevel: number;
  minRpm: number;
  maxRpm: number;

  // Results
  results: AnalysisResults;
}
