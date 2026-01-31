/**
 * Main mobile sensor recording interface
 * Full-screen layout optimized for mobile use on kart
 */

import { useSensorRecording } from '@/hooks/useSensorRecording';
import { CalibrationOverlay } from './CalibrationOverlay';
import { RecordingControls } from './RecordingControls';
import { LiveDataDisplay } from './LiveDataDisplay';
import { SensorPowerCurve } from './SensorPowerCurve';
import { useSensorStore } from '@/stores/sensorStore';
import type { SpeedPowerPoint, SensorSessionStatistics } from '@/types/sensor';
import { Smartphone, AlertCircle, Gauge } from 'lucide-react';

interface SensorRecordingViewProps {
  onBack: () => void;
}

export function SensorRecordingView({ onBack }: SensorRecordingViewProps) {
  const {
    recordingState,
    calibrationProgress,
    sampleCount,
    recordingDuration,
    liveSpeed,
    liveAcceleration,
    gpsAccuracy,
    speedPowerCurve,
    statistics,
    error,
    checkSensorSupport,
    startCalibration,
    pause,
    resume,
    stop,
    cancel,
  } = useSensorRecording();

  const { kartWeight, setKartWeight } = useSensorStore();

  // Check sensor support
  const support = checkSensorSupport();

  // Render based on state
  if (recordingState === 'idle') {
    return (
      <IdleView
        onStart={startCalibration}
        onBack={onBack}
        kartWeight={kartWeight}
        onKartWeightChange={setKartWeight}
        motionSupported={support.motion}
        gpsSupported={support.geolocation}
      />
    );
  }

  if (
    recordingState === 'requesting-permissions' ||
    recordingState === 'calibrating-gravity' ||
    recordingState === 'calibrating-forward'
  ) {
    return (
      <CalibrationOverlay
        state={recordingState}
        progress={calibrationProgress}
        onCancel={cancel}
      />
    );
  }

  if (recordingState === 'recording' || recordingState === 'paused') {
    return (
      <RecordingView
        isPaused={recordingState === 'paused'}
        sampleCount={sampleCount}
        duration={recordingDuration}
        liveSpeed={liveSpeed}
        liveAcceleration={liveAcceleration}
        gpsAccuracy={gpsAccuracy}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onCancel={cancel}
      />
    );
  }

  if (recordingState === 'processing') {
    return <ProcessingView />;
  }

  if (recordingState === 'stopped' || recordingState === 'error') {
    return (
      <ResultsView
        speedPowerCurve={speedPowerCurve}
        statistics={statistics}
        error={error}
        onNewRecording={cancel}
        onBack={onBack}
      />
    );
  }

  return null;
}

// Idle view - setup before recording
function IdleView({
  onStart,
  onBack,
  kartWeight,
  onKartWeightChange,
  motionSupported,
  gpsSupported,
}: {
  onStart: () => void;
  onBack: () => void;
  kartWeight: number;
  onKartWeightChange: (weight: number) => void;
  motionSupported: boolean;
  gpsSupported: boolean;
}) {
  const sensorsAvailable = motionSupported && gpsSupported;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="text-yellow-500" size={24} />
            <h1 className="text-lg font-bold text-slate-100">Sensor Recording</h1>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-2 text-slate-400 hover:text-slate-200"
          >
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Sensor status */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">SENSOR STATUS</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Motion Sensor</span>
              <span
                className={
                  motionSupported ? 'text-green-400' : 'text-red-400'
                }
              >
                {motionSupported ? 'Available' : 'Not available'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">GPS</span>
              <span
                className={gpsSupported ? 'text-green-400' : 'text-red-400'}
              >
                {gpsSupported ? 'Available' : 'Not available'}
              </span>
            </div>
          </div>
        </div>

        {/* Weight input */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">
            KART WEIGHT (with driver)
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={kartWeight}
              onChange={(e) => onKartWeightChange(Number(e.target.value))}
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-3 text-xl text-center text-slate-100"
              min={100}
              max={300}
              step={1}
            />
            <span className="text-slate-400 text-lg">kg</span>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            Include driver weight for accurate power calculation
          </p>
        </div>

        {/* Instructions */}
        <div className="card bg-slate-800/50">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">INSTRUCTIONS</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
            <li>Mount phone securely on kart (any orientation)</li>
            <li>Press START and keep kart stationary for 3 seconds</li>
            <li>Drive straight for 5 seconds to calibrate direction</li>
            <li>Recording starts automatically after calibration</li>
            <li>Drive normally - accelerate through gears</li>
            <li>Press STOP when finished</li>
          </ol>
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={!sensorsAvailable}
          className="w-full py-6 rounded-xl bg-yellow-500 text-slate-900 text-2xl font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          START
        </button>

        {!sensorsAvailable && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>
              Sensors not available. Use a mobile device with GPS and accelerometer.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

// Recording view - during active recording
function RecordingView({
  isPaused,
  sampleCount,
  duration,
  liveSpeed,
  liveAcceleration,
  gpsAccuracy,
  onPause,
  onResume,
  onStop,
  onCancel,
}: {
  isPaused: boolean;
  sampleCount: number;
  duration: number;
  liveSpeed: number | null;
  liveAcceleration: number | null;
  gpsAccuracy: number | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Recording indicator */}
      <div
        className={`py-2 text-center text-sm font-semibold ${
          isPaused ? 'bg-yellow-600' : 'bg-red-600 animate-pulse'
        }`}
      >
        {isPaused ? 'PAUSED' : 'RECORDING'}
      </div>

      {/* Live data display */}
      <div className="flex-1 p-4">
        <LiveDataDisplay
          speed={liveSpeed}
          acceleration={liveAcceleration}
          gpsAccuracy={gpsAccuracy}
          sampleCount={sampleCount}
          duration={duration}
        />
      </div>

      {/* Controls */}
      <div className="p-4 pb-8">
        <RecordingControls
          isPaused={isPaused}
          duration={duration}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

// Processing view
function ProcessingView() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Gauge className="w-16 h-16 mx-auto text-yellow-500 animate-spin" />
        <p className="mt-4 text-xl text-slate-300">Processing data...</p>
        <p className="mt-2 text-slate-500">Calculating power curve</p>
      </div>
    </div>
  );
}

// Results view
function ResultsView({
  speedPowerCurve,
  statistics,
  error,
  onNewRecording,
  onBack,
}: {
  speedPowerCurve: SpeedPowerPoint[] | null;
  statistics: SensorSessionStatistics | null;
  error: string | null;
  onNewRecording: () => void;
  onBack: () => void;
}) {
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
        <p className="text-slate-400 text-center mb-6">{error}</p>
        <button
          onClick={onNewRecording}
          className="px-6 py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100">Results</h1>
          <button
            onClick={onBack}
            className="px-3 py-2 text-slate-400 hover:text-slate-200"
          >
            Done
          </button>
        </div>
      </header>

      {/* Statistics */}
      {statistics && (
        <div className="p-4 grid grid-cols-2 gap-3">
          <StatCard label="Peak Power" value={`${statistics.peakPower.toFixed(1)} CV`} />
          <StatCard label="@ Speed" value={`${statistics.peakPowerSpeed.toFixed(0)} km/h`} />
          <StatCard label="Max Speed" value={`${statistics.maxSpeed.toFixed(0)} km/h`} />
          <StatCard label="Max Accel" value={`${statistics.maxAcceleration.toFixed(2)} G`} />
        </div>
      )}

      {/* Power curve chart */}
      <div className="flex-1 p-4">
        {speedPowerCurve && speedPowerCurve.length > 0 ? (
          <SensorPowerCurve data={speedPowerCurve} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            No data to display
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pb-8">
        <button
          onClick={onNewRecording}
          className="w-full py-4 bg-yellow-500 text-slate-900 font-bold rounded-xl text-lg"
        >
          New Recording
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}
