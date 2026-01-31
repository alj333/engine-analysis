/**
 * Recording controls component
 * Large STOP button, PAUSE/RESUME toggle, duration display
 */

import { Square, Pause, Play, X } from 'lucide-react';

interface RecordingControlsProps {
  isPaused: boolean;
  duration: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingControls({
  isPaused,
  duration,
  onPause,
  onResume,
  onStop,
  onCancel,
}: RecordingControlsProps) {
  return (
    <div className="space-y-4">
      {/* Duration display */}
      <div className="text-center">
        <div className="text-4xl font-mono text-slate-100">
          {formatDuration(duration)}
        </div>
        <div className="text-sm text-slate-500 mt-1">
          Recording Duration
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-600 active:scale-95 transition-transform"
          aria-label="Cancel recording"
        >
          <X size={28} />
        </button>

        {/* Stop button (large, prominent) */}
        <button
          onClick={onStop}
          className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 active:scale-95 transition-transform shadow-lg shadow-red-600/30"
          aria-label="Stop recording"
        >
          <Square size={40} fill="currentColor" />
        </button>

        {/* Pause/Resume button */}
        <button
          onClick={isPaused ? onResume : onPause}
          className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform ${
            isPaused
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-yellow-600 text-slate-900 hover:bg-yellow-500'
          }`}
          aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
        >
          {isPaused ? <Play size={28} /> : <Pause size={28} />}
        </button>
      </div>

      {/* Status hint */}
      <p className="text-center text-slate-500 text-sm">
        {isPaused
          ? 'Recording paused. Tap play to resume.'
          : 'Tap the red button to stop recording.'}
      </p>
    </div>
  );
}

/**
 * Format duration in ms to MM:SS.s format
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${tenths}`;
}
