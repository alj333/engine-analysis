import { create } from 'zustand';
import type { AnalysisResults, BinnedResult, LapTelemetryResult } from '@/types/results';

interface ResultsState {
  // Current analysis results
  results: AnalysisResults | null;

  // Comparison results (for File 1 vs File 2)
  comparisonResults: AnalysisResults | null;

  // UI state
  isAnalyzing: boolean;
  analysisError: string | null;
  activeChart: ChartType;
  selectedLapForTelemetry: number;

  // Actions
  setResults: (results: AnalysisResults) => void;
  setComparisonResults: (results: AnalysisResults | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
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
  analysisError: null,
  activeChart: 'power',
  selectedLapForTelemetry: 0,

  // Actions
  setResults: (results) => set({ results, analysisError: null }),
  setComparisonResults: (comparisonResults) => set({ comparisonResults }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisError: (analysisError) => set({ analysisError, isAnalyzing: false }),
  setActiveChart: (activeChart) => set({ activeChart }),
  setSelectedLapForTelemetry: (selectedLapForTelemetry) => set({ selectedLapForTelemetry }),

  clearResults: () =>
    set({
      results: null,
      isAnalyzing: false,
      analysisError: null,
    }),

  clearComparison: () => set({ comparisonResults: null }),
}));

// Selector hooks for common data patterns
export const usePowerCurve = (): BinnedResult[] => {
  const results = useResultsStore((state) => state.results);
  return results?.binnedResults ?? [];
};

export const useComparisonPowerCurve = (): BinnedResult[] => {
  const results = useResultsStore((state) => state.comparisonResults);
  return results?.binnedResults ?? [];
};

export const useLapTelemetry = (): LapTelemetryResult[] => {
  const results = useResultsStore((state) => state.results);
  return results?.lapTelemetry ?? [];
};

export const usePeakValues = () => {
  const results = useResultsStore((state) => state.results);
  return {
    peakPower: results?.statistics.peakPower ?? { rpm: 0, power: 0 },
    peakTorque: results?.statistics.peakTorque ?? { rpm: 0, torque: 0 },
  };
};

export const useStatistics = () => {
  const results = useResultsStore((state) => state.results);
  return results?.statistics ?? null;
};
