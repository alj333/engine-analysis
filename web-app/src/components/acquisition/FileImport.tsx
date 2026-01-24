import { useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAcquisitionStore } from '@/stores/acquisitionStore';

export function FileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fileName, isLoading, error, setLoading, setError } = useAcquisitionStore();

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);

      try {
        // For now, just show that file was selected
        // Full parsing will be implemented in Phase 3
        console.log('File selected:', file.name);

        // Placeholder - will be replaced with actual parsing
        setTimeout(() => {
          setLoading(false);
          // In Phase 3, we'll actually parse the file here
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setLoading(false);
      }
    },
    [setLoading, setError]
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
            <span className="text-sm text-slate-400">Loading...</span>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="text-green-500" size={32} />
            <span className="text-sm text-slate-300">{fileName}</span>
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

      {/* File Info */}
      {fileName && !error && (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <FileText size={14} />
          Supported: AIM, UNIPRO, ALFANO, Cosworth CSV exports
        </div>
      )}
    </div>
  );
}
