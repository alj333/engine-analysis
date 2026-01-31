/**
 * Combined sensor recording hook
 * Manages device motion + GPS, calibration flow, and sample buffering
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSensorStore } from '@/stores/sensorStore';
import type { SensorSample, CalibrationData } from '@/types/sensor';
import {
  startAccelerometer,
  requestMotionPermission,
  isDeviceMotionSupported,
  type AccelerometerReading,
} from '@/lib/sensors/deviceMotion';
import {
  startGPS,
  requestGeolocationPermission,
  isGeolocationSupported,
  type GPSReading,
} from '@/lib/sensors/gps';
import {
  CalibrationManager,
  transformAcceleration,
} from '@/lib/sensors/calibration';
import { processSensorData } from '@/lib/sensors/sensorPowerCalculation';
import { saveSensorSession } from '@/lib/storage/db';

const SAMPLE_RATE_MS = 20; // Target ~50Hz

export function useSensorRecording() {
  const {
    recordingState,
    calibration,
    calibrationProgress,
    sampleBuffer,
    liveSpeed,
    liveAcceleration,
    gpsAccuracy,
    speedPowerCurve,
    statistics,
    error,
    setRecordingState,
    setError,
    setPermissions,
    setCalibration,
    setCalibrationProgress,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    addSample,
    setResults,
    updateLiveData,
    reset,
  } = useSensorStore();

  // Refs for sensor callbacks
  const accelCleanupRef = useRef<(() => void) | null>(null);
  const gpsCleanupRef = useRef<(() => void) | null>(null);
  const calibrationRef = useRef<CalibrationManager | null>(null);
  const lastGpsRef = useRef<GPSReading | null>(null);
  const lastSampleTimeRef = useRef<number>(0);
  const recordingStartRef = useRef<number>(0);
  const calibrationDataRef = useRef<CalibrationData | null>(null);

  // State for triggering re-renders during recording (updated via interval)
  const [, setTick] = useState(0);

  // Update display duration periodically during recording
  useEffect(() => {
    if (recordingState !== 'recording') {
      return;
    }

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState]);

  // Compute current duration based on state
  const displayDuration = (() => {
    const { recordingDuration, recordingStartTime } = useSensorStore.getState();
    if (recordingState === 'recording' && recordingStartTime) {
      return recordingDuration + (Date.now() - recordingStartTime);
    }
    return recordingDuration;
  })();

  // Check sensor support
  const checkSensorSupport = useCallback((): {
    motion: boolean;
    geolocation: boolean;
  } => {
    return {
      motion: isDeviceMotionSupported(),
      geolocation: isGeolocationSupported(),
    };
  }, []);

  // Begin recording (after calibration) - defined first to be used in startCalibration
  const beginRecording = useCallback(
    (calibrationData: CalibrationData) => {
      calibrationDataRef.current = calibrationData;
      recordingStartRef.current = Date.now();
      startRecording();

      // Update accelerometer callback for recording
      if (accelCleanupRef.current) {
        accelCleanupRef.current();
      }

      accelCleanupRef.current = startAccelerometer((reading) => {
        const state = useSensorStore.getState().recordingState;
        if (state !== 'recording') return;

        // Rate limit samples
        const now = Date.now();
        if (now - lastSampleTimeRef.current < SAMPLE_RATE_MS) return;
        lastSampleTimeRef.current = now;

        // Create sample
        const gps = lastGpsRef.current;
        const sample: SensorSample = {
          timestamp: now - recordingStartRef.current,
          accelX: reading.x,
          accelY: reading.y,
          accelZ: reading.z,
          gpsSpeed: gps?.speed ?? null,
          gpsAccuracy: gps?.accuracy ?? null,
          latitude: gps?.latitude ?? null,
          longitude: gps?.longitude ?? null,
        };

        addSample(sample);

        // Update live data
        if (calibrationDataRef.current) {
          const transformed = transformAcceleration(reading, calibrationDataRef.current);
          updateLiveData({
            acceleration: transformed.forward / 9.81, // Convert to G
          });
        }
      });
    },
    [startRecording, addSample, updateLiveData]
  );

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setRecordingState('requesting-permissions');
    setError(null);

    try {
      // Request motion permission (iOS requires user gesture)
      const motionResult = await requestMotionPermission();
      setPermissions({ motion: motionResult });

      if (motionResult === 'denied') {
        setError('Motion sensor permission denied. Please enable in Settings.');
        return false;
      }

      // Request geolocation permission
      const geoResult = await requestGeolocationPermission();
      setPermissions({ geolocation: geoResult });

      if (geoResult === 'denied') {
        setError('Location permission denied. Please enable in Settings.');
        return false;
      }

      return true;
    } catch (err) {
      setError(`Permission error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [setRecordingState, setError, setPermissions]);

  // Start calibration
  const startCalibration = useCallback(async () => {
    // First request permissions if needed
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      return;
    }

    setRecordingState('calibrating-gravity');
    setCalibrationProgress(0);
    calibrationRef.current = new CalibrationManager();

    const handleCalibrationReading = (reading: AccelerometerReading) => {
      if (!calibrationRef.current) return;

      const state = useSensorStore.getState().recordingState;

      if (state === 'calibrating-gravity') {
        const progress = calibrationRef.current.addGravitySample(reading);
        setCalibrationProgress(progress);

        if (calibrationRef.current.isGravityCalibrationComplete()) {
          setRecordingState('calibrating-forward');
          setCalibrationProgress(0);
        }
      } else if (state === 'calibrating-forward') {
        const progress = calibrationRef.current.addForwardSample(reading);
        setCalibrationProgress(progress);

        if (calibrationRef.current.isForwardCalibrationComplete()) {
          const calibrationData = calibrationRef.current.buildCalibrationData();
          if (calibrationData) {
            setCalibration(calibrationData);
            // Automatically start recording after successful calibration
            beginRecording(calibrationData);
          } else {
            setError('Calibration failed. Please try again.');
            setRecordingState('idle');
          }
        }
      }
    };

    // Start accelerometer for calibration
    accelCleanupRef.current = startAccelerometer(handleCalibrationReading);

    // Start GPS for speed data
    gpsCleanupRef.current = startGPS(
      (reading) => {
        lastGpsRef.current = reading;
        updateLiveData({
          speed: reading.speed !== null ? reading.speed * 3.6 : null, // Convert to km/h
          gpsAccuracy: reading.accuracy,
        });
      },
      (gpsError) => {
        console.warn('GPS error during calibration:', gpsError.message);
      }
    );
  }, [requestPermissions, setRecordingState, setCalibrationProgress, setCalibration, setError, updateLiveData, beginRecording]);

  // Pause recording
  const handlePause = useCallback(() => {
    pauseRecording();
  }, [pauseRecording]);

  // Resume recording
  const handleResume = useCallback(() => {
    resumeRecording();
    recordingStartRef.current = Date.now();
  }, [resumeRecording]);

  // Stop recording and process data
  const handleStop = useCallback(async () => {
    stopRecording();
    setRecordingState('processing');

    // Stop sensors
    if (accelCleanupRef.current) {
      accelCleanupRef.current();
      accelCleanupRef.current = null;
    }
    if (gpsCleanupRef.current) {
      gpsCleanupRef.current();
      gpsCleanupRef.current = null;
    }

    const { sampleBuffer, calibration, kartWeight, recordingDuration } =
      useSensorStore.getState();

    if (!calibration || sampleBuffer.length === 0) {
      setError('No data recorded');
      setRecordingState('stopped');
      return;
    }

    try {
      // Process sensor data
      const { curve, statistics } = processSensorData(sampleBuffer, calibration, {
        kartWeight,
        filterLevel: 50,
      });

      setResults(curve, statistics);

      // Save to database
      await saveSensorSession({
        name: `Recording ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        kartWeight,
        recordingDuration,
        calibration,
        samples: sampleBuffer,
        speedPowerCurve: curve,
        statistics,
      });

      setRecordingState('stopped');
    } catch (err) {
      setError(`Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRecordingState('stopped');
    }
  }, [stopRecording, setRecordingState, setError, setResults]);

  // Cancel/reset
  const handleCancel = useCallback(() => {
    // Stop sensors
    if (accelCleanupRef.current) {
      accelCleanupRef.current();
      accelCleanupRef.current = null;
    }
    if (gpsCleanupRef.current) {
      gpsCleanupRef.current();
      gpsCleanupRef.current = null;
    }
    calibrationRef.current = null;
    calibrationDataRef.current = null;
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (accelCleanupRef.current) accelCleanupRef.current();
      if (gpsCleanupRef.current) gpsCleanupRef.current();
    };
  }, []);

  return {
    // State
    recordingState,
    calibrationProgress,
    calibration,
    sampleCount: sampleBuffer.length,
    recordingDuration: displayDuration,
    liveSpeed,
    liveAcceleration,
    gpsAccuracy,
    speedPowerCurve,
    statistics,
    error,

    // Actions
    checkSensorSupport,
    startCalibration,
    pause: handlePause,
    resume: handleResume,
    stop: handleStop,
    cancel: handleCancel,
  };
}
