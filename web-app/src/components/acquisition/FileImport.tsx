import { useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { parseCSV } from '@/lib/parsers/csvParser';

export function FileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

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
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isLoading ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/5'}
        `}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
            <span className="text-sm text-slate-400">Parsing CSV file...</span>
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
