/**
 * Step-by-step calibration UI overlay
 * Visual instructions for gravity and forward direction detection
 */

import type { RecordingState } from '@/types/sensor';
import { Smartphone, MoveHorizontal, X } from 'lucide-react';

interface CalibrationOverlayProps {
  state: RecordingState;
  progress: number;
  onCancel: () => void;
}

export function CalibrationOverlay({
  state,
  progress,
  onCancel,
}: CalibrationOverlayProps) {
  const isGravity = state === 'calibrating-gravity';
  const isForward = state === 'calibrating-forward';
  const isPermissions = state === 'requesting-permissions';

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* Cancel button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onCancel}
          className="p-3 text-slate-400 hover:text-slate-200"
          aria-label="Cancel"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        {isPermissions && <PermissionsStep />}
        {isGravity && <GravityStep progress={progress} />}
        {isForward && <ForwardStep progress={progress} />}
      </div>

      {/* Progress bar */}
      {(isGravity || isForward) && (
        <div className="px-8 pb-12">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-center text-slate-500 text-sm mt-3">
            {Math.round(progress * 100)}% complete
          </p>
        </div>
      )}
    </div>
  );
}

function PermissionsStep() {
  return (
    <>
      <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
        <Smartphone className="w-10 h-10 text-yellow-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-4">
        Requesting Permissions
      </h1>
      <p className="text-slate-400 text-lg max-w-xs">
        Please allow access to motion sensors and location when prompted.
      </p>
    </>
  );
}

function GravityStep({ progress }: { progress: number }) {
  return (
    <>
      {/* Animated phone icon */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`transition-all duration-300 ${
              progress > 0.5 ? 'text-green-400' : 'text-yellow-500'
            }`}
          >
            <Smartphone size={64} />
          </div>
        </div>
        {/* Pulse effect */}
        {progress < 1 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-yellow-500/50 animate-ping" />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-100 mb-4">
        Keep Still
      </h1>

      <p className="text-slate-400 text-lg max-w-xs mb-8">
        Hold the phone steady on the kart. Detecting gravity direction...
      </p>

      {/* Timer visualization */}
      <div className="text-4xl font-mono text-yellow-500">
        {Math.ceil((1 - progress) * 3)}s
      </div>
    </>
  );
}

function ForwardStep({ progress }: { progress: number }) {
  return (
    <>
      {/* Animated arrow icon */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <MoveHorizontal
            size={64}
            className={`transition-all duration-300 ${
              progress > 0.5 ? 'text-green-400' : 'text-yellow-500'
            }`}
          />
        </div>
        {/* Movement indicator */}
        {progress < 1 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute w-4 h-4 bg-yellow-500 rounded-full animate-bounce"
              style={{
                animation: 'moveRight 1s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-100 mb-4">
        Drive Straight
      </h1>

      <p className="text-slate-400 text-lg max-w-xs mb-8">
        Accelerate in a straight line. Detecting forward direction...
      </p>

      {/* Timer visualization */}
      <div className="text-4xl font-mono text-yellow-500">
        {Math.ceil((1 - progress) * 5)}s
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes moveRight {
          0%, 100% { transform: translateX(-20px); opacity: 0; }
          50% { transform: translateX(20px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
