import { create } from 'zustand';
import type { AnalysisResults, BinnedResult, LapTelemetryResult } from '@/types/results';

interface ResultsState {
  // Current analysis results
  results: AnalysisResults | null;

  // Comparison results (for File 1 vs File 2)
  comparisonResults: AnalysisResults | null;

  // UI state
  isAnalyzing: boolean;
  activeChart: ChartType;
  selectedLapForTelemetry: number;

  // Actions
  setResults: (results: AnalysisResults) => void;
  setComparisonResults: (results: AnalysisResults | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setActiveChart: (chart: ChartType) => void;
  setSelectedLapForTelemetry: (lapIndex: number) => void;
  clearResults: () => void;
  clearComparison: () => void;
}

export type ChartType =
  | 'power'
  | 'torque'
  | 'tempHead'
  | 'tempCool'
  | 'tempExhaust'
  | 'lambda'
  | 'gearEngaged'
  | 'throttle'
  | 'speed'
  | 'rpm'
  | 'acceleration'
  | 'powerVsTime';

export const useResultsStore = create<ResultsState>((set) => ({
  // Initial state
  results: null,
  comparisonResults: null,
  isAnalyzing: false,
  activeChart: 'power',
  selectedLapForTelemetry: 0,

  // Actions
  setResults: (results) => set({ results }),
  setComparisonResults: (comparisonResults) => set({ comparisonResults }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setActiveChart: (activeChart) => set({ activeChart }),
  setSelectedLapForTelemetry: (selectedLapForTelemetry) => set({ selectedLapForTelemetry }),

  clearResults: () =>
    set({
      results: null,
      isAnalyzing: false,
    }),

  clearComparison: () => set({ comparisonResults: null }),
}));

// Selector hooks for common data patterns
export const usePowerCurve = (): BinnedResult[] => {
  const results = useResultsStore((state) => state.results);
  return results?.powerCurve ?? [];
};

export const useComparisonPowerCurve = (): BinnedResult[] => {
  const results = useResultsStore((state) => state.comparisonResults);
  return results?.powerCurve ?? [];
};

export const useLapTelemetry = (): LapTelemetryResult[] => {
  const results = useResultsStore((state) => state.results);
  return results?.lapTelemetry ?? [];
};

export const usePeakValues = () => {
  const results = useResultsStore((state) => state.results);
  return {
    peakPower: results?.peakPower ?? { value: 0, rpm: 0 },
    peakTorque: results?.peakTorque ?? { value: 0, rpm: 0 },
  };
};
