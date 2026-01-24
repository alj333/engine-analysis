// Raw telemetry data from CSV import
export interface TelemetryData {
  time: number[];           // seconds
  distance: number[];       // km
  rpm: number[];            // engine RPM
  speed: number[];          // km/h (GPS speed)
  latAcc: number[];         // lateral acceleration (g)
  lonAcc: number[];         // longitudinal acceleration (g)
  slope?: number[];         // track slope (degrees)
  tempHead?: number[];      // head temperature (°C)
  tempCool?: number[];      // coolant temperature (°C)
  tempExhaust?: number[];   // exhaust temperature (°C)
  lambda?: number[];        // air-fuel ratio
  throttle?: number[];      // throttle position (%)
  lapMarkers: number[];     // indices where new laps start
}

// Lap information extracted from telemetry
export interface LapInfo {
  index: number;            // lap number (0-based)
  lapTime: number;          // seconds
  startIndex: number;       // data index where lap starts
  endIndex: number;         // data index where lap ends
  isOutLap: boolean;        // first lap (exit from pits)
  isInLap: boolean;         // last lap (return to pits)
}

// Channel mapping status
export type ChannelStatus = 'matched' | 'unmatched' | 'manual';

export interface ChannelMapping {
  [channelName: string]: {
    header: string | null;
    status: ChannelStatus;
    multiplier?: number;    // e.g., -1 for inverted channels
  };
}

// CSV metadata from file header
export interface CSVMetadata {
  format?: string;          // e.g., "AIM CSV File"
  venue?: string;
  vehicle?: string;
  driver?: string;
  date?: string;
  time?: string;
  sampleRate?: number;      // Hz
  duration?: number;        // seconds
  segmentTimes?: number[];  // cumulative times (beacon markers) in seconds
  lapTimes?: number[];      // individual lap times in seconds
}

// Parsed CSV result
export interface ParsedCSV {
  data: TelemetryData;
  headers: string[];
  metadata: CSVMetadata;
  laps: LapInfo[];
  channelMapping: ChannelMapping;
}
