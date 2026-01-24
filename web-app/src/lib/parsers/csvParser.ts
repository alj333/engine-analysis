import Papa from 'papaparse';
import type { TelemetryData, LapInfo, ChannelMapping, CSVMetadata, ParsedCSV } from '@/types/telemetry';

// Channel name mappings for auto-detection
const CHANNEL_MAPPINGS: Record<string, string[]> = {
  time: [
    'Time', 'time', 'Time(sec)', 'Time_s', 'RunningLapTime', 'Lap Time',
    'lap time [s]', 'Time [s]', 'sec'
  ],
  distance: [
    'Distance', 'distance', 'Space', 'space', 'Lap Distance[m]', 'GPS_Distance',
    'GPS Distance', 'km'
  ],
  speed: [
    'GPS_Speed', 'Speed', 'SpeedGPS', 'GPS Speed', 'SPEEDG_Kph', 'V_Front',
    'speed', 'XKart Speed[kph]', 'GPS_Speed[km/h]', 'GPS Speed[km/h]', 'km/h'
  ],
  rpm: [
    'RPM', 'Engine', 'Rpm', 'rpm', 'engine speed', 'XKart RPM[rpm]', 'RPM_F',
    'Engine Speed', 'Engine RPM'
  ],
  latAcc: [
    'GPS_LatAcc', 'A. Lat.', 'Ay', 'acc_lat', 'GX[G]', 'ACC_CG_NF', 'GPS Lat.',
    'Lateral Acc', 'Lat Acc', 'LatAcc'
  ],
  lonAcc: [
    'GPS_LonAcc', 'A. Long.', 'Ax', 'acc_lon', 'GY[G]', 'ACC_X', 'GPS Long.',
    'Longitudinal Acc', 'Lon Acc', 'LonAcc'
  ],
  slope: [
    'GPS_Slope', 'slope', 'Slope', 'Track Slope'
  ],
  tempHead: [
    'temp_head', 'Head Temp', 'HeadTemp', 'Temperature 1', 'Temp1', 'CHT',
    'Cylinder Head Temp', 'Temperature'
  ],
  tempCool: [
    'temp_cool', 'Water Temp', 'WaterTemp', 'Coolant', 'Temperature 2', 'Temp2',
    'Coolant Temp', 'Water'
  ],
  tempExhaust: [
    'temp_exhaust', 'Exhaust Temp', 'ExhaustTemp', 'EGT', 'Exhaust Gas Temp',
    'Temperature 3', 'Temp3'
  ],
  lambda: [
    'lambda', 'Lambda', 'AFR', 'Air Fuel Ratio', 'Lambda_Temp', 'O2'
  ],
  throttle: [
    'Throttle', 'throttle', 'TPS', 'Throttle Position', 'PosAcceleratore',
    'Accelerator', '%'
  ],
  lap: [
    'Lap', 'lap', 'Lap Number', 'LAP', 'Lap #'
  ],
};

// Detect channel from header name
function detectChannel(header: string): string | null {
  const normalizedHeader = header.toLowerCase().trim();

  for (const [channel, aliases] of Object.entries(CHANNEL_MAPPINGS)) {
    for (const alias of aliases) {
      if (normalizedHeader === alias.toLowerCase() ||
          normalizedHeader.includes(alias.toLowerCase())) {
        return channel;
      }
    }
  }
  return null;
}

// Build channel mapping from headers
function buildChannelMapping(headers: string[]): ChannelMapping {
  const mapping: ChannelMapping = {};

  // Initialize all channels as unmatched
  for (const channel of Object.keys(CHANNEL_MAPPINGS)) {
    mapping[channel] = { header: null, status: 'unmatched' };
  }

  // Try to match headers to channels
  for (const header of headers) {
    const channel = detectChannel(header);
    if (channel && mapping[channel].status === 'unmatched') {
      mapping[channel] = { header, status: 'matched' };
    }
  }

  return mapping;
}

// Parse AIM CSV metadata from header rows
function parseAIMMetadata(rows: string[][]): CSVMetadata {
  const metadata: CSVMetadata = {};

  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0]?.replace(/"/g, '').toLowerCase();
    const value = row[1]?.replace(/"/g, '');

    switch (key) {
      case 'format':
        metadata.format = value;
        break;
      case 'venue':
        metadata.venue = value;
        break;
      case 'vehicle':
        metadata.vehicle = value;
        break;
      case 'user':
      case 'driver':
        metadata.driver = value;
        break;
      case 'date':
        metadata.date = value;
        break;
      case 'time':
        metadata.time = value;
        break;
      case 'sample rate':
        metadata.sampleRate = parseInt(value) || 10;
        break;
      case 'duration':
        metadata.duration = parseFloat(value) || 0;
        break;
      case 'segment times':
      case 'beacon markers':
        // Parse lap times from comma-separated values
        const times = row.slice(1)
          .map(t => parseFloat(t?.replace(/"/g, '') || '0'))
          .filter(t => t > 0);
        if (times.length > 0) {
          metadata.segmentTimes = times;
        }
        break;
    }
  }

  return metadata;
}

// Extract lap information from telemetry data
function extractLaps(
  data: TelemetryData,
  metadata: CSVMetadata
): LapInfo[] {
  const laps: LapInfo[] = [];

  if (data.lapMarkers.length > 0) {
    // Use lap markers from data
    for (let i = 0; i < data.lapMarkers.length; i++) {
      const startIndex = data.lapMarkers[i];
      const endIndex = i < data.lapMarkers.length - 1
        ? data.lapMarkers[i + 1] - 1
        : data.time.length - 1;

      const lapTime = data.time[endIndex] - data.time[startIndex];

      laps.push({
        index: i,
        lapTime,
        startIndex,
        endIndex,
        isOutLap: i === 0,
        isInLap: i === data.lapMarkers.length - 1 && lapTime > 90, // Assume in-lap if > 90s
      });
    }
  } else if (metadata.segmentTimes && metadata.segmentTimes.length > 0) {
    // Use segment times from metadata
    let currentIndex = 0;

    for (let i = 0; i < metadata.segmentTimes.length; i++) {
      const lapTime = i === 0
        ? metadata.segmentTimes[i]
        : metadata.segmentTimes[i] - metadata.segmentTimes[i - 1];

      const startIndex = currentIndex;
      const endTime = metadata.segmentTimes[i];

      // Find the index where this lap ends
      while (currentIndex < data.time.length && data.time[currentIndex] < endTime) {
        currentIndex++;
      }

      laps.push({
        index: i,
        lapTime,
        startIndex,
        endIndex: currentIndex - 1,
        isOutLap: i === 0,
        isInLap: false,
      });
    }
  } else {
    // No lap markers - treat entire session as one lap
    laps.push({
      index: 0,
      lapTime: data.time[data.time.length - 1] - data.time[0],
      startIndex: 0,
      endIndex: data.time.length - 1,
      isOutLap: false,
      isInLap: false,
    });
  }

  return laps;
}

// Get column data by channel
function getColumnData(
  rows: Record<string, string>[],
  channelMapping: ChannelMapping,
  channel: string
): number[] {
  const mapping = channelMapping[channel];
  if (!mapping?.header) return [];

  return rows.map(row => {
    const value = parseFloat(row[mapping.header!] || '0');
    return isNaN(value) ? 0 : value * (mapping.multiplier || 1);
  });
}

// Main CSV parser
export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const allRows = results.data as string[][];

          // Find where the data starts (after metadata/headers)
          let dataStartRow = 0;
          let headers: string[] = [];

          // Look for the header row (contains column names)
          for (let i = 0; i < Math.min(20, allRows.length); i++) {
            const row = allRows[i];
            if (!row || row.length < 3) continue;

            // Check if this row looks like headers (contains known channel names)
            const firstCell = row[0]?.replace(/"/g, '').toLowerCase();
            if (firstCell === 'time' || firstCell === 'distance' ||
                row.some(cell => detectChannel(cell?.replace(/"/g, '') || '') !== null)) {
              headers = row.map(h => h?.replace(/"/g, '') || '');
              dataStartRow = i + 1;

              // Skip unit rows (rows that contain units like "sec", "km/h", etc.)
              while (dataStartRow < allRows.length) {
                const nextRow = allRows[dataStartRow];
                const firstVal = nextRow?.[0]?.replace(/"/g, '').toLowerCase();
                if (firstVal && !isNaN(parseFloat(firstVal))) {
                  break; // Found numeric data
                }
                dataStartRow++;
              }
              break;
            }
          }

          if (headers.length === 0) {
            throw new Error('Could not find column headers in CSV file');
          }

          // Parse metadata from rows before headers
          const metadataRows = allRows.slice(0, dataStartRow - 1);
          const metadata = parseAIMMetadata(metadataRows);

          // Build channel mapping
          const channelMapping = buildChannelMapping(headers);

          // Parse data rows into objects
          const dataRows = allRows.slice(dataStartRow)
            .filter(row => row && row.length >= headers.length && row[0] !== '')
            .map(row => {
              const obj: Record<string, string> = {};
              headers.forEach((header, i) => {
                obj[header] = row[i]?.replace(/"/g, '') || '';
              });
              return obj;
            });

          if (dataRows.length === 0) {
            throw new Error('No data rows found in CSV file');
          }

          // Extract telemetry data
          const telemetryData: TelemetryData = {
            time: getColumnData(dataRows, channelMapping, 'time'),
            distance: getColumnData(dataRows, channelMapping, 'distance'),
            rpm: getColumnData(dataRows, channelMapping, 'rpm'),
            speed: getColumnData(dataRows, channelMapping, 'speed'),
            latAcc: getColumnData(dataRows, channelMapping, 'latAcc'),
            lonAcc: getColumnData(dataRows, channelMapping, 'lonAcc'),
            slope: getColumnData(dataRows, channelMapping, 'slope'),
            tempHead: getColumnData(dataRows, channelMapping, 'tempHead'),
            tempCool: getColumnData(dataRows, channelMapping, 'tempCool'),
            tempExhaust: getColumnData(dataRows, channelMapping, 'tempExhaust'),
            lambda: getColumnData(dataRows, channelMapping, 'lambda'),
            throttle: getColumnData(dataRows, channelMapping, 'throttle'),
            lapMarkers: [],
          };

          // Detect lap markers from lap channel if available
          const lapData = getColumnData(dataRows, channelMapping, 'lap');
          if (lapData.length > 0) {
            let currentLap = lapData[0];
            telemetryData.lapMarkers.push(0);
            for (let i = 1; i < lapData.length; i++) {
              if (lapData[i] !== currentLap) {
                telemetryData.lapMarkers.push(i);
                currentLap = lapData[i];
              }
            }
          }

          // Extract lap information
          const laps = extractLaps(telemetryData, metadata);

          resolve({
            data: telemetryData,
            headers,
            metadata,
            laps,
            channelMapping,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

// Format lap time as MM:SS.mmm
export function formatLapTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--.---';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}
