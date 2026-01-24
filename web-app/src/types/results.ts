// Individual power calculation result (per data point)
export interface PowerDataPoint {
  rpm: number;
  speed: number;            // km/h
  power: number;            // CV (horsepower)
  torque: number;           // N*m
  gear: number;             // detected gear (1-6, 0 = unknown)
  tempHead: number;         // °C
  tempCool: number;         // °C
  tempExhaust: number;      // °C
  lambda: number;
  lapIndex: number;         // which lap this point came from
  timeIndex: number;        // index within the lap
}

// Binned/averaged result by RPM
export interface BinnedResult {
  rpm: number;              // bin center RPM
  avgSpeed: number;         // km/h
  avgPower: number;         // CV
  avgTorque: number;        // N*m
  avgTempHead: number;      // °C
  avgTempCool: number;      // °C
  avgTempExhaust: number;   // °C
  avgLambda: number;
  sampleCount: number;      // number of samples in this bin
}

// Telemetry result for lap visualization (time-based arrays)
export interface LapTelemetryResult {
  lapIndex: number;
  lapTime: number;          // total lap time in seconds
  time: number[];           // seconds from lap start
  speed: number[];          // km/h
  rpm: number[];
  lonAcc: number[];         // g
  latAcc: number[];         // g
  throttle: number[];       // %
  power: number[];          // CV
  gear: number[];           // detected gear
  tempHead: number[];       // °C
  tempCool: number[];       // °C
  tempExhaust: number[];    // °C
}

// Analysis statistics
export interface AnalysisStatistics {
  peakPower: {
    rpm: number;
    power: number;          // CV
  };
  peakTorque: {
    rpm: number;
    torque: number;         // N*m
  };
  avgPower: number;         // CV
  avgTorque: number;        // N*m
  rpmRange: {
    min: number;
    max: number;
  };
  totalSamples: number;
}

// Complete analysis results
export interface AnalysisResults {
  // Power curve data (binned by RPM)
  binnedResults: BinnedResult[];

  // Number of raw data points before binning
  rawDataPoints: number;

  // Lap telemetry for visualization
  lapTelemetry: LapTelemetryResult[];

  // Statistics
  statistics: AnalysisStatistics;

  // Configuration metadata
  config: {
    kartName: string;
    engineName: string;
    tyreName: string;
    finalRatio: number;
    selectedLaps: number[];
  };

  // Timestamp
  timestamp: string;
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
