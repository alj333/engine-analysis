import { Flag, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { formatLapTime } from '@/lib/parsers/csvParser';

export function LapSelector() {
  const { laps, selectedLaps, toggleLap, selectBestLaps } = useAcquisitionStore();

  if (laps.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Flag size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Import a CSV file to see laps</p>
      </div>
    );
  }

  // Sort laps by time to find best laps
  const sortedByTime = [...laps]
    .filter(lap => !lap.isOutLap && !lap.isInLap)
    .sort((a, b) => a.lapTime - b.lapTime);

  const bestLapIndex = sortedByTime[0]?.index;

  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {selectedLaps.length} of {laps.length} laps selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => selectBestLaps(5)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            Best 5
          </button>
          <button
            onClick={() => selectBestLaps(laps.filter(l => !l.isOutLap && !l.isInLap).length)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            All Valid
          </button>
        </div>
      </div>

      {/* Lap list */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
        {laps.map((lap) => {
          const isSelected = selectedLaps.includes(lap.index);
          const isBest = lap.index === bestLapIndex;

          return (
            <button
              key={lap.index}
              onClick={() => toggleLap(lap.index)}
              disabled={lap.isOutLap || lap.isInLap}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left
                ${isSelected
                  ? 'bg-yellow-500/20 border border-yellow-500/50'
                  : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                }
                ${(lap.isOutLap || lap.isInLap) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Checkbox */}
              <div className={`${isSelected ? 'text-yellow-500' : 'text-slate-500'}`}>
                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>

              {/* Lap number */}
              <div className="w-8 text-sm font-medium text-slate-400">
                {lap.isOutLap ? 'Out' : lap.isInLap ? 'In' : `${lap.index + 1}`}
              </div>

              {/* Lap time */}
              <div className={`flex-1 font-mono text-sm ${
                isBest ? 'text-green-400 font-semibold' : 'text-slate-200'
              }`}>
                {formatLapTime(lap.lapTime)}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1">
                {isBest && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                    BEST
                  </span>
                )}
                {lap.isOutLap && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-400 rounded">
                    OUT LAP
                  </span>
                )}
                {lap.isInLap && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-400 rounded">
                    IN LAP
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Warning if less than recommended laps selected */}
      {selectedLaps.length > 0 && selectedLaps.length < 3 && (
        <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-500/10 p-2 rounded">
          <AlertTriangle size={14} />
          <span>Recommend selecting 5-6 laps for best results</span>
        </div>
      )}

      {/* Info about out/in laps */}
      {(laps.some(l => l.isOutLap) || laps.some(l => l.isInLap)) && (
        <p className="text-xs text-slate-500">
          Out/in laps are excluded from analysis
        </p>
      )}
    </div>
  );
}
