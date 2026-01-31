import { create } from 'zustand';
import type {
  RecordingState,
  CalibrationData,
  SensorSample,
  SpeedPowerPoint,
  SensorSessionStatistics,
  SensorPermissions,
} from '@/types/sensor';

interface SensorState {
  // Recording state machine
  recordingState: RecordingState;
  error: string | null;

  // Permissions
  permissions: SensorPermissions;

  // Calibration
  calibration: CalibrationData | null;
  calibrationProgress: number; // 0-1

  // Recording
  recordingStartTime: number | null;
  recordingDuration: number; // ms
  sampleBuffer: SensorSample[];

  // Configuration
  kartWeight: number; // kg (with driver)

  // Results (after processing)
  speedPowerCurve: SpeedPowerPoint[] | null;
  statistics: SensorSessionStatistics | null;

  // Live sensor data (for display)
  liveSpeed: number | null; // km/h
  liveAcceleration: number | null; // G-force (forward)
  gpsAccuracy: number | null; // meters

  // Actions
  setRecordingState: (state: RecordingState) => void;
  setError: (error: string | null) => void;
  setPermissions: (permissions: Partial<SensorPermissions>) => void;
  setCalibration: (calibration: CalibrationData | null) => void;
  setCalibrationProgress: (progress: number) => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  addSample: (sample: SensorSample) => void;
  setKartWeight: (weight: number) => void;
  setResults: (curve: SpeedPowerPoint[], statistics: SensorSessionStatistics) => void;
  updateLiveData: (data: { speed?: number | null; acceleration?: number | null; gpsAccuracy?: number | null }) => void;
  reset: () => void;
}

const initialState = {
  recordingState: 'idle' as RecordingState,
  error: null,
  permissions: {
    motion: 'prompt' as const,
    geolocation: 'prompt' as const,
  },
  calibration: null,
  calibrationProgress: 0,
  recordingStartTime: null,
  recordingDuration: 0,
  sampleBuffer: [],
  kartWeight: 175, // Default: kart (~75kg) + driver (~100kg)
  speedPowerCurve: null,
  statistics: null,
  liveSpeed: null,
  liveAcceleration: null,
  gpsAccuracy: null,
};

export const useSensorStore = create<SensorState>((set, get) => ({
  ...initialState,

  setRecordingState: (recordingState) => set({ recordingState }),

  setError: (error) => set({ error, recordingState: error ? 'error' : get().recordingState }),

  setPermissions: (permissions) =>
    set((state) => ({
      permissions: { ...state.permissions, ...permissions },
    })),

  setCalibration: (calibration) => set({ calibration }),

  setCalibrationProgress: (calibrationProgress) => set({ calibrationProgress }),

  startRecording: () =>
    set({
      recordingState: 'recording',
      recordingStartTime: Date.now(),
      recordingDuration: 0,
      sampleBuffer: [],
      speedPowerCurve: null,
      statistics: null,
    }),

  pauseRecording: () => {
    const { recordingStartTime, recordingDuration } = get();
    const additionalDuration = recordingStartTime ? Date.now() - recordingStartTime : 0;
    set({
      recordingState: 'paused',
      recordingDuration: recordingDuration + additionalDuration,
      recordingStartTime: null,
    });
  },

  resumeRecording: () =>
    set({
      recordingState: 'recording',
      recordingStartTime: Date.now(),
    }),

  stopRecording: () => {
    const { recordingStartTime, recordingDuration } = get();
    const additionalDuration = recordingStartTime ? Date.now() - recordingStartTime : 0;
    set({
      recordingState: 'stopped',
      recordingDuration: recordingDuration + additionalDuration,
      recordingStartTime: null,
    });
  },

  addSample: (sample) =>
    set((state) => ({
      sampleBuffer: [...state.sampleBuffer, sample],
    })),

  setKartWeight: (kartWeight) => set({ kartWeight }),

  setResults: (speedPowerCurve, statistics) => set({ speedPowerCurve, statistics }),

  updateLiveData: (data) =>
    set((state) => ({
      liveSpeed: data.speed !== undefined ? data.speed : state.liveSpeed,
      liveAcceleration: data.acceleration !== undefined ? data.acceleration : state.liveAcceleration,
      gpsAccuracy: data.gpsAccuracy !== undefined ? data.gpsAccuracy : state.gpsAccuracy,
    })),

  reset: () => set(initialState),
}));
