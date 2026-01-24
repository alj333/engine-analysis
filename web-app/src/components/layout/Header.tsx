import { useState } from 'react';
import {
  Play,
  BarChart3,
  Save,
  FolderOpen,
  Printer,
  Info,
  FileUp,
  GitCompare,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  onStart: () => void;
  onOutput: () => void;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  onOpen: () => void;
  onPrint: () => void;
  onLoadFile1: () => void;
  onLoadFile2: () => void;
  onCompare: () => void;
  isAnalyzing: boolean;
  hasResults: boolean;
  hasComparison: boolean;
  activeView: 'input' | 'output';
}

export function Header({
  onStart,
  onOutput,
  onBack,
  onReset,
  onSave,
  onOpen,
  onPrint,
  onLoadFile1,
  onLoadFile2,
  onCompare,
  isAnalyzing,
  hasResults,
  hasComparison,
  activeView,
}: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500 text-slate-900 font-bold px-3 py-1 rounded">
            NT
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            ENGINE ANALYSIS
            <span className="text-sm font-normal text-slate-400 ml-2">Web</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Primary Actions */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
            <button
              onClick={onOpen}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-slate-300"
              title="Open saved session"
            >
              <FolderOpen size={18} />
              <span className="hidden sm:inline">Open</span>
            </button>

            {activeView === 'output' && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-slate-300"
                title="Back to setup"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <button
              onClick={onStart}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 disabled:opacity-50"
              title="Start analysis"
            >
              <Play size={18} />
              <span>START</span>
            </button>

            <button
              onClick={onOutput}
              disabled={!hasResults}
              className="flex items-center gap-2 px-3 py-2 rounded bg-yellow-600 text-slate-900 font-semibold hover:bg-yellow-500 disabled:opacity-50"
              title="View results"
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">OUTPUT</span>
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/20 text-red-400"
              title="Reset all data"
            >
              <RotateCcw size={18} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onSave}
              disabled={!hasResults}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-50"
              title="Save session"
            >
              <Save size={18} />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={onPrint}
              disabled={!hasResults}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-50"
              title="Print results"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={() => setShowInfo(true)}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-slate-300"
              title="Info"
            >
              <Info size={18} />
            </button>
          </div>

          {/* Comparison Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 ml-2">
            <button
              onClick={onLoadFile1}
              className="flex items-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-500"
              title="Load File 1 for comparison"
            >
              <FileUp size={16} />
              <span className="text-sm">File 1</span>
            </button>

            <button
              onClick={onLoadFile2}
              className="flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
              title="Load File 2 for comparison"
            >
              <FileUp size={16} />
              <span className="text-sm">File 2</span>
            </button>

            <button
              onClick={onCompare}
              disabled={!hasComparison}
              className="flex items-center gap-2 px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
              title="Compare sessions"
            >
              <GitCompare size={16} />
              <span className="text-sm">Comp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-yellow-500 mb-4">Engine Analysis Web</h2>
            <p className="text-slate-300 mb-4">
              Web-based kart engine telemetry analysis tool.
              Process CSV data from your data logger to calculate power and torque curves.
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Based on NT-Project Engine Analysis software.
              This web version runs entirely in your browser - no data is sent to any server.
            </p>
            <button
              onClick={() => setShowInfo(false)}
              className="btn btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
