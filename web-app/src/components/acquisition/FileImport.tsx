import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Info, Database } from 'lucide-react';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { parseCSV } from '@/lib/parsers/csvParser';

// Sample files available in public/samples
const SAMPLE_FILES = [
  {
    name: 'esempio.csv',
    label: 'AIM Example Session',
    description: 'Sample telemetry data from a kart session',
  },
];

export function FileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const {
    fileName,
    metadata,
    isLoading,
    error,
    rawData,
    setFileData,
    setLoading,
    setError,
    clearData,
  } = useAcquisitionStore();

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);

      try {
        const parsed = await parseCSV(file);

        setFileData(
          file.name,
          parsed.metadata,
          parsed.data,
          parsed.headers,
          parsed.laps,
          parsed.channelMapping
        );
      } catch (err) {
        console.error('CSV parsing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        clearData();
      } finally {
        setLoading(false);
      }
    },
    [setFileData, setLoading, setError, clearData]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await processFile(file);
    },
    [processFile]
  );

  const handleLoadSample = useCallback(
    async (sampleName: string) => {
      setLoadingSample(true);
      setError(null);

      try {
        const response = await fetch(`/samples/${sampleName}`);
        if (!response.ok) {
          throw new Error(`Failed to load sample file: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], sampleName, { type: 'text/csv' });
        await processFile(file);
      } catch (err) {
        console.error('Sample loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sample file');
      } finally {
        setLoadingSample(false);
      }
    },
    [processFile, setError]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const isLoadingAny = isLoading || loadingSample;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onClick={() => !isLoadingAny && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isLoadingAny ? 'border-yellow-500 bg-yellow-500/10 cursor-wait' : 'border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/5'}
        `}
      >
        {isLoadingAny ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
            <span className="text-sm text-slate-400">
              {loadingSample ? 'Loading sample data...' : 'Parsing CSV file...'}
            </span>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="text-green-500" size={32} />
            <span className="text-sm text-slate-300 font-medium">{fileName}</span>
            <span className="text-xs text-slate-500">Click to change file</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-slate-500" size={32} />
            <span className="text-sm text-slate-400">
              IMPORT ACQUISITION DATA FILE
            </span>
            <span className="text-xs text-slate-500">
              Drop CSV file here or click to browse
            </span>
          </div>
        )}
      </div>

      {/* Sample Data Buttons */}
      {!fileName && !isLoadingAny && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Database size={14} />
            <span>Or load sample data:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_FILES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleLoadSample(sample.name)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors flex items-center gap-2"
                title={sample.description}
              >
                <FileText size={14} className="text-cyan-500" />
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* File Metadata */}
      {fileName && metadata && !error && (
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Info size={14} className="text-cyan-500" />
            <span className="font-medium">File Info</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
            {metadata.format && (
              <>
                <span>Format:</span>
                <span className="text-slate-300">{metadata.format}</span>
              </>
            )}
            {metadata.venue && (
              <>
                <span>Venue:</span>
                <span className="text-slate-300">{metadata.venue}</span>
              </>
            )}
            {metadata.date && (
              <>
                <span>Date:</span>
                <span className="text-slate-300">{metadata.date}</span>
              </>
            )}
            {metadata.driver && (
              <>
                <span>Driver:</span>
                <span className="text-slate-300">{metadata.driver}</span>
              </>
            )}
            {metadata.sampleRate && (
              <>
                <span>Sample Rate:</span>
                <span className="text-slate-300">{metadata.sampleRate} Hz</span>
              </>
            )}
            {rawData && (
              <>
                <span>Data Points:</span>
                <span className="text-slate-300">{rawData.time.length.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Supported formats info */}
      {!fileName && (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <FileText size={14} />
          Supported: AIM, UNIPRO, ALFANO, Cosworth CSV exports
        </div>
      )}
    </div>
  );
}
