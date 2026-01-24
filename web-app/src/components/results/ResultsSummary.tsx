import { Zap, Gauge, Activity, Clock } from 'lucide-react';
import type { AnalysisStatistics } from '@/types/results';

interface ResultsSummaryProps {
  statistics: AnalysisStatistics;
  configInfo: {
    kartName: string;
    engineName: string;
    tyreName: string;
    finalRatio: number;
    selectedLaps: number[];
  };
  timestamp: string;
}

export function ResultsSummary({ statistics, configInfo }: ResultsSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Peak Power */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <Zap size={18} />
          <span className="text-xs font-medium uppercase">Peak Power</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {statistics.peakPower.power.toFixed(2)} <span className="text-sm text-slate-400">CV</span>
        </div>
        <div className="text-xs text-slate-500">
          @ {statistics.peakPower.rpm} RPM
        </div>
      </div>

      {/* Peak Torque */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-400 mb-2">
          <Gauge size={18} />
          <span className="text-xs font-medium uppercase">Peak Torque</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {statistics.peakTorque.torque.toFixed(2)} <span className="text-sm text-slate-400">N·m</span>
        </div>
        <div className="text-xs text-slate-500">
          @ {statistics.peakTorque.rpm} RPM
        </div>
      </div>

      {/* RPM Range */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <Activity size={18} />
          <span className="text-xs font-medium uppercase">RPM Range</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {statistics.rpmRange.min} - {statistics.rpmRange.max}
        </div>
        <div className="text-xs text-slate-500">
          {statistics.totalSamples} samples
        </div>
      </div>

      {/* Config Summary */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <Clock size={18} />
          <span className="text-xs font-medium uppercase">Configuration</span>
        </div>
        <div className="text-xs text-slate-300 space-y-0.5">
          <div className="truncate">{configInfo.engineName}</div>
          <div className="truncate">{configInfo.kartName}</div>
          <div className="text-slate-500">
            Final: {configInfo.finalRatio.toFixed(3)} | {configInfo.selectedLaps.length} laps
          </div>
        </div>
      </div>
    </div>
  );
}
