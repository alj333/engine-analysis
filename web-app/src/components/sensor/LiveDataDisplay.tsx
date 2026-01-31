/**
 * Real-time sensor data display during recording
 * Shows speed, acceleration, and GPS status
 */

import { Navigation, Activity, Signal, Database } from 'lucide-react';

interface LiveDataDisplayProps {
  speed: number | null;
  acceleration: number | null;
  gpsAccuracy: number | null;
  sampleCount: number;
  duration: number;
}

export function LiveDataDisplay({
  speed,
  acceleration,
  gpsAccuracy,
  sampleCount,
  duration,
}: LiveDataDisplayProps) {
  const speedKmh = speed ?? 0;
  const accelG = acceleration ?? 0;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Speed display - large and prominent */}
      <div className="flex-1 bg-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Navigation size={20} />
          <span className="text-sm uppercase tracking-wider">Speed</span>
        </div>
        <div className="text-7xl font-bold text-slate-100 tabular-nums">
          {Math.round(speedKmh)}
        </div>
        <div className="text-2xl text-slate-400">km/h</div>
      </div>

      {/* Acceleration display - G-force meter style */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <Activity size={20} />
          <span className="text-sm uppercase tracking-wider">Forward Acceleration</span>
        </div>

        {/* G-force meter */}
        <GForceMeter value={accelG} />

        <div className="text-center mt-2">
          <span className="text-3xl font-bold text-slate-100 tabular-nums">
            {accelG >= 0 ? '+' : ''}{accelG.toFixed(2)}
          </span>
          <span className="text-xl text-slate-400 ml-2">G</span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex gap-3">
        {/* GPS accuracy */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 flex items-center gap-3">
          <Signal
            size={20}
            className={getGpsAccuracyColor(gpsAccuracy)}
          />
          <div>
            <div className="text-xs text-slate-500">GPS</div>
            <div className="text-sm text-slate-300">
              {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : '--'}
            </div>
          </div>
        </div>

        {/* Sample count */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 flex items-center gap-3">
          <Database size={20} className="text-blue-400" />
          <div>
            <div className="text-xs text-slate-500">Samples</div>
            <div className="text-sm text-slate-300 tabular-nums">
              {sampleCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Sample rate */}
        <div className="flex-1 bg-slate-800 rounded-xl p-4 flex items-center gap-3">
          <Activity size={20} className="text-purple-400" />
          <div>
            <div className="text-xs text-slate-500">Rate</div>
            <div className="text-sm text-slate-300 tabular-nums">
              {duration > 0
                ? `${Math.round((sampleCount / duration) * 1000)} Hz`
                : '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * G-force meter visualization
 */
function GForceMeter({ value }: { value: number }) {
  // Clamp value to display range
  const clampedValue = Math.max(-2, Math.min(2, value));
  const percentage = ((clampedValue + 2) / 4) * 100;

  // Determine color based on value
  const getColor = () => {
    if (value > 0.5) return 'bg-green-500';
    if (value < -0.5) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="relative">
      {/* Scale markers */}
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>-2G</span>
        <span>-1G</span>
        <span>0</span>
        <span>+1G</span>
        <span>+2G</span>
      </div>

      {/* Track */}
      <div className="h-4 bg-slate-700 rounded-full relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-y-0 left-0 right-0"
          style={{
            background:
              'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)',
            opacity: 0.2,
          }}
        />

        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500" />

        {/* Indicator */}
        <div
          className={`absolute top-0 bottom-0 w-3 rounded-full shadow-lg transition-all duration-100 ${getColor()}`}
          style={{
            left: `calc(${percentage}% - 6px)`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Get GPS accuracy indicator color
 */
function getGpsAccuracyColor(accuracy: number | null): string {
  if (accuracy === null) return 'text-slate-500';
  if (accuracy <= 5) return 'text-green-400';
  if (accuracy <= 15) return 'text-yellow-400';
  return 'text-red-400';
}
