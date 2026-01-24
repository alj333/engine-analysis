import Papa from 'papaparse';
import type { TelemetryData, LapInfo, ChannelMapping, CSVMetadata, ParsedCSV } from '@/types/telemetry';

// Channel name mappings for auto-detection
const CHANNEL_MAPPINGS: Record<string, string[]> = {
  time: [
    'Time', 'time', 'Time(sec)', 'Time_s', 'RunningLapTime', 'Lap Time',
    'lap time [s]', 'Time [s]'
  ],
  distance: [
    'Distance', 'distance', 'Space', 'space', 'Lap Distance[m]', 'GPS_Distance',
    'GPS Distance'
  ],
  speed: [
    'GPS_Speed', 'Speed', 'SpeedGPS', 'GPS Speed', 'SPEEDG_Kph', 'V_Front',
    'speed', 'XKart Speed[kph]', 'GPS_Speed[km/h]', 'GPS Speed[km/h]'
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
    'Accelerator'
  ],
  lap: [
    'Lap', 'lap', 'Lap Number', 'LAP', 'Lap #'
  ],
};

// Metadata keys to skip when looking for headers (these are key-value metadata rows)
// Note: 'time' is NOT included because it conflicts with the "Time" data column header
const METADATA_KEYS = [
  'format', 'venue', 'vehicle', 'user', 'driver', 'data source', 'comment',
  'date', 'sample rate', 'duration', 'segment', 'beacon markers',
  'segment times', 'session'
];

// Detect channel from header name
function detectChannel(header: string): string | null {
  if (!header) return null;
  const normalizedHeader = header.toLowerCase().trim();

  // Skip if it looks like a lap time (contains colon with numbers, like "0:58.421")
  if (/^\d+:\d+/.test(normalizedHeader)) return null;

  for (const [channel, aliases] of Object.entries(CHANNEL_MAPPINGS)) {
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase();
      if (normalizedHeader === normalizedAlias ||
          normalizedHeader.includes(normalizedAlias)) {
        return channel;
      }
    }
  }
  return null;
}

// Check if a row looks like a header row (has multiple channel matches)
function isHeaderRow(row: string[]): boolean {
  if (!row || row.length < 3) return false;

  const firstCell = row[0]?.replace(/"/g, '').toLowerCase().trim();

  // Skip if first cell is a known metadata key (but not 'time' which is also a data column)
  // Also check if it looks like a metadata row (key-value pair format)
  if (METADATA_KEYS.some(key => firstCell === key || firstCell.startsWith(key + ' '))) {
    return false;
  }

  // Count how many cells match known channels
  let channelMatches = 0;
  const nonEmptyCells = row.filter(cell => cell?.replace(/"/g, '').trim()).length;

  for (const cell of row) {
    const cleanCell = cell?.replace(/"/g, '').trim();
    if (cleanCell && detectChannel(cleanCell)) {
      channelMatches++;
    }
  }

  // Header row should have at least 3 channel matches (Time, Speed/RPM, etc.)
  // AND have more than 2 non-empty cells (to distinguish from metadata key-value rows)
  if (channelMatches >= 3 && nonEmptyCells >= 3) {
    return true;
  }

  // Also accept if first cell is exactly "time" or "distance" AND we have multiple columns
  if ((firstCell === 'time' || firstCell === 'distance') && nonEmptyCells >= 3) {
    return true;
  }

  return false;
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
    if (!header) continue;
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
  let beaconMarkers: number[] = [];
  let segmentTimes: number[] = [];

  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0]?.replace(/"/g, '').toLowerCase().trim();
    const value = row[1]?.replace(/"/g, '').trim();

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
      case 'beacon markers':
        // Beacon markers are cumulative times in seconds (preferred)
        for (let i = 1; i < row.length; i++) {
          const cellValue = row[i]?.replace(/"/g, '').trim();
          if (!cellValue) continue;

          // Handle comma-separated values in a single cell
          const parts = cellValue.split(',');
          for (const part of parts) {
            const t = parseFloat(part.trim());
            if (!isNaN(t) && t > 0) {
              beaconMarkers.push(t);
            }
          }
        }
        break;
      case 'segment times':
        // Segment times may be in MM:SS.mmm format (individual lap times)
        for (let i = 1; i < row.length; i++) {
          const cellValue = row[i]?.replace(/"/g, '').trim();
          if (!cellValue) continue;

          // Handle MM:SS.mmm format
          if (cellValue.includes(':')) {
            const [mins, secs] = cellValue.split(':');
            const totalSecs = parseInt(mins) * 60 + parseFloat(secs);
            if (!isNaN(totalSecs) && totalSecs > 0) {
              segmentTimes.push(totalSecs);
            }
          } else {
            const t = parseFloat(cellValue);
            if (!isNaN(t) && t > 0) {
              segmentTimes.push(t);
            }
          }
        }
        break;
    }
  }

  // Prefer beacon markers (cumulative times) over segment times
  if (beaconMarkers.length > 0) {
    // Beacon markers are already cumulative - use them directly
    metadata.segmentTimes = beaconMarkers;
    metadata.lapTimes = segmentTimes.length > 0 ? segmentTimes : undefined;
  } else if (segmentTimes.length > 0) {
    // Check if segment times are cumulative (increasing) or individual
    const isIncreasing = segmentTimes.every((t, i) => i === 0 || t > segmentTimes[i - 1]);

    if (isIncreasing) {
      // Already cumulative
      metadata.segmentTimes = segmentTimes;
    } else {
      // Individual lap times - convert to cumulative
      let cumulative = 0;
      metadata.segmentTimes = segmentTimes.map(t => {
        cumulative += t;
        return cumulative;
      });
      metadata.lapTimes = segmentTimes;
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
        isInLap: i === data.lapMarkers.length - 1 && lapTime > 90,
      });
    }
  } else if (metadata.segmentTimes && metadata.segmentTimes.length > 0) {
    // Use segment times from metadata (cumulative times from beacon markers)
    let currentIndex = 0;

    for (let i = 0; i < metadata.segmentTimes.length; i++) {
      // Use individual lap times if available, otherwise calculate from cumulative
      const lapTime = metadata.lapTimes && metadata.lapTimes[i]
        ? metadata.lapTimes[i]
        : (i === 0
            ? metadata.segmentTimes[i]
            : metadata.segmentTimes[i] - metadata.segmentTimes[i - 1]);

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
        endIndex: Math.max(0, currentIndex - 1),
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

          // Look for the header row (contains column names like Time, RPM, Speed)
          for (let i = 0; i < Math.min(30, allRows.length); i++) {
            const row = allRows[i];

            // Skip empty or short rows
            if (!row || row.length < 3) continue;

            // Check if this row looks like a header row
            if (isHeaderRow(row)) {
              // Clean up headers - remove quotes and empty strings
              headers = row
                .map(h => h?.replace(/"/g, '').trim() || '')
                .filter((h, idx) => h || idx < row.length - 1); // Keep non-empty, allow trailing

              // Remove trailing empty headers
              while (headers.length > 0 && !headers[headers.length - 1]) {
                headers.pop();
              }

              dataStartRow = i + 1;

              // Skip additional header rows and unit rows
              while (dataStartRow < allRows.length) {
                const nextRow = allRows[dataStartRow];
                if (!nextRow || nextRow.length < 3) {
                  dataStartRow++;
                  continue;
                }

                const firstVal = nextRow[0]?.replace(/"/g, '').trim();

                // Check if this is another header row (duplicate)
                if (isHeaderRow(nextRow)) {
                  dataStartRow++;
                  continue;
                }

                // Check if this is a units row (contains "sec", "km/h", "rpm", etc.)
                const looksLikeUnits = nextRow.some(cell => {
                  const c = cell?.replace(/"/g, '').toLowerCase().trim();
                  return ['sec', 'km', 'km/h', 'rpm', 'g', 'm/s', 'm', '%', '°c'].includes(c);
                });

                if (looksLikeUnits) {
                  dataStartRow++;
                  continue;
                }

                // Check if this is a channel number row (contains just numbers like 1, 2, 3, 4)
                const allSmallNumbers = nextRow.every(cell => {
                  const c = cell?.replace(/"/g, '').trim();
                  if (!c) return true;
                  const num = parseInt(c);
                  return !isNaN(num) && num >= 0 && num <= 20;
                });

                if (allSmallNumbers && nextRow.filter(c => c?.trim()).length > 2) {
                  dataStartRow++;
                  continue;
                }

                // Check if we've reached actual numeric data
                if (firstVal && !isNaN(parseFloat(firstVal))) {
                  break;
                }

                dataStartRow++;
              }
              break;
            }
          }

          if (headers.length === 0) {
            throw new Error('Could not find column headers in CSV file. Expected headers like Time, RPM, GPS_Speed, etc.');
          }

          // Parse metadata from rows before headers
          const metadataRows = allRows.slice(0, dataStartRow - 1);
          const metadata = parseAIMMetadata(metadataRows);

          // Build channel mapping with auto-detection
          const channelMapping = buildChannelMapping(headers);

          // Parse data rows into objects
          const dataRows = allRows.slice(dataStartRow)
            .filter(row => {
              if (!row || row.length < Math.min(3, headers.length)) return false;
              const firstVal = row[0]?.replace(/"/g, '').trim();
              // Must have a numeric first value (time)
              return firstVal !== '' && !isNaN(parseFloat(firstVal));
            })
            .map(row => {
              const obj: Record<string, string> = {};
              headers.forEach((header, i) => {
                if (header) {
                  obj[header] = row[i]?.replace(/"/g, '').trim() || '';
                }
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

          console.log('Parsed CSV:', {
            headers,
            channelMapping,
            dataRowCount: dataRows.length,
            lapCount: laps.length,
            metadata
          });

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
