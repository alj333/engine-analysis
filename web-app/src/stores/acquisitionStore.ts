import { create } from 'zustand';
import type { TelemetryData, LapInfo, ChannelMapping, CSVMetadata } from '@/types/telemetry';

interface AcquisitionState {
  // Loaded file data
  fileName: string | null;
  metadata: CSVMetadata | null;
  rawData: TelemetryData | null;
  headers: string[];

  // Channel mapping
  channelMapping: ChannelMapping;
  keepSelectedLabels: boolean;

  // Lap selection
  laps: LapInfo[];
  selectedLaps: number[];  // indices of selected laps

  // Filter options
  filterLevel: number;     // 0-100

  // Results options
  minRpm: number;
  maxRpm: number;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  setFileData: (
    fileName: string,
    metadata: CSVMetadata,
    data: TelemetryData,
    headers: string[],
    laps: LapInfo[],
    channelMapping: ChannelMapping
  ) => void;
  updateChannelMapping: (channel: string, header: string | null, multiplier?: number) => void;
  setKeepSelectedLabels: (keep: boolean) => void;
  setSelectedLaps: (laps: number[]) => void;
  toggleLap: (lapIndex: number) => void;
  selectBestLaps: (count: number) => void;
  setFilterLevel: (level: number) => void;
  setMinRpm: (rpm: number) => void;
  setMaxRpm: (rpm: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
}

export const useAcquisitionStore = create<AcquisitionState>((set, get) => ({
  // Initial state
  fileName: null,
  metadata: null,
  rawData: null,
  headers: [],
  channelMapping: {},
  keepSelectedLabels: false,
  laps: [],
  selectedLaps: [],
  filterLevel: 50,
  minRpm: 8000,
  maxRpm: 16000,
  isLoading: false,
  error: null,

  // Actions
  setFileData: (fileName, metadata, data, headers, laps, channelMapping) => {
    // Auto-select best laps (skip first lap, select up to 5-6 best)
    const sortedLaps = [...laps]
      .filter((lap) => !lap.isOutLap && !lap.isInLap)
      .sort((a, b) => a.lapTime - b.lapTime);
    const bestLapIndices = sortedLaps.slice(0, 5).map((lap) => lap.index);

    // Auto-detect RPM range from data
    let detectedMinRpm = 8000;
    let detectedMaxRpm = 16000;

    if (data.rpm && data.rpm.length > 0) {
      const validRpms = data.rpm.filter(r => r > 0 && r < 25000);
      if (validRpms.length > 0) {
        const actualMin = Math.min(...validRpms);
        const actualMax = Math.max(...validRpms);

        // Set min to slightly below the 5th percentile, max to slightly above 95th percentile
        const sortedRpms = [...validRpms].sort((a, b) => a - b);
        const p5Index = Math.floor(sortedRpms.length * 0.05);
        const p95Index = Math.floor(sortedRpms.length * 0.95);

        // Round to nearest 500 RPM for cleaner values
        detectedMinRpm = Math.max(1000, Math.floor(sortedRpms[p5Index] / 500) * 500 - 500);
        detectedMaxRpm = Math.ceil(sortedRpms[p95Index] / 500) * 500 + 500;

        console.log('Auto-detected RPM range:', detectedMinRpm, '-', detectedMaxRpm,
          '(actual:', actualMin.toFixed(0), '-', actualMax.toFixed(0), ')');
      }
    }

    set({
      fileName,
      metadata,
      rawData: data,
      headers,
      laps,
      channelMapping,
      selectedLaps: bestLapIndices,
      minRpm: detectedMinRpm,
      maxRpm: detectedMaxRpm,
      error: null,
    });
  },

  updateChannelMapping: (channel, header, multiplier) =>
    set((state) => ({
      channelMapping: {
        ...state.channelMapping,
        [channel]: {
          header,
          status: header ? 'manual' : 'unmatched',
          multiplier,
        },
      },
    })),

  setKeepSelectedLabels: (keep) => set({ keepSelectedLabels: keep }),

  setSelectedLaps: (selectedLaps) => set({ selectedLaps }),

  toggleLap: (lapIndex) =>
    set((state) => {
      const isSelected = state.selectedLaps.includes(lapIndex);
      return {
        selectedLaps: isSelected
          ? state.selectedLaps.filter((i) => i !== lapIndex)
          : [...state.selectedLaps, lapIndex].sort((a, b) => a - b),
      };
    }),

  selectBestLaps: (count) => {
    const { laps } = get();
    const sortedLaps = [...laps]
      .filter((lap) => !lap.isOutLap && !lap.isInLap)
      .sort((a, b) => a.lapTime - b.lapTime);
    const bestLapIndices = sortedLaps.slice(0, count).map((lap) => lap.index);
    set({ selectedLaps: bestLapIndices });
  },

  setFilterLevel: (filterLevel) => set({ filterLevel }),
  setMinRpm: (minRpm) => set({ minRpm }),
  setMaxRpm: (maxRpm) => set({ maxRpm }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  clearData: () =>
    set({
      fileName: null,
      metadata: null,
      rawData: null,
      headers: [],
      channelMapping: {},
      laps: [],
      selectedLaps: [],
      error: null,
    }),
}));
