import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Download, CheckCircle, XCircle, AlertTriangle, Loader2, FileDown, Filter, Calendar } from 'lucide-react';
import { api, AdifImportResponse } from '../api/client';
import { GlassPanel, GlassCard } from '../components/GlassPanel';

export function AdifPlugin() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<AdifImportResponse | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showExportFilters, setShowExportFilters] = useState(false);

  // Export filters
  const [exportCallsign, setExportCallsign] = useState('');
  const [exportBand, setExportBand] = useState('');
  const [exportMode, setExportMode] = useState('');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ file, skipDuplicates }: { file: File; skipDuplicates: boolean }) =>
      api.importAdif(file, skipDuplicates),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['qsos'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => api.exportAdif({
      callsign: exportCallsign || undefined,
      band: exportBand || undefined,
      mode: exportMode || undefined,
      fromDate: exportFromDate || undefined,
      toDate: exportToDate || undefined,
    }),
    onSuccess: (blob) => {
      downloadBlob(blob, `log4ym_export_${new Date().toISOString().slice(0, 10)}.adi`);
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate({ file, skipDuplicates });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [skipDuplicates, importMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.adi') || file.name.endsWith('.adif') || file.name.endsWith('.xml'))) {
      importMutation.mutate({ file, skipDuplicates });
    }
  }, [skipDuplicates, importMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleExport = useCallback(() => {
    exportMutation.mutate();
  }, [exportMutation]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearExportFilters = () => {
    setExportCallsign('');
    setExportBand('');
    setExportMode('');
    setExportFromDate('');
    setExportToDate('');
  };

  const hasExportFilters = exportCallsign || exportBand || exportMode || exportFromDate || exportToDate;

  return (
    <GlassPanel
      title="ADIF Manager"
      icon={<FileText className="w-5 h-5" />}
    >
      <div className="p-4 space-y-4">
        {/* Import Section */}
        <GlassCard>
          <h4 className="font-semibold text-gray-200 flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4" />
            Import ADIF
          </h4>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${importMutation.isPending
                ? 'border-accent-primary/50 bg-accent-primary/10'
                : 'border-glass-200 hover:border-accent-primary/50 hover:bg-dark-600/30'
              }
            `}
          >
            {importMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
                <p className="text-gray-400">Importing...</p>
              </div>
            ) : (
              <>
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-300 mb-1">Drop ADIF file here or click to browse</p>
                <p className="text-sm text-gray-500">Supports .adi, .adif, and .xml files</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".adi,.adif,.xml"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Options */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="skipDuplicates"
              checked={skipDuplicates}
              onChange={e => setSkipDuplicates(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="skipDuplicates" className="text-sm text-gray-400">
              Skip duplicate QSOs (same callsign, date, time, band, mode)
            </label>
          </div>
        </GlassCard>

        {/* Import Results */}
        {importResult && (
          <GlassCard>
            <h4 className="font-semibold text-gray-200 flex items-center gap-2 mb-3">
              {importResult.errorCount === 0 && importResult.importedCount > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : importResult.errorCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              Import Results
            </h4>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-primary">{importResult.totalRecords}</p>
                <p className="text-xs text-gray-500">Total Records</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{importResult.importedCount}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{importResult.skippedDuplicates}</p>
                <p className="text-xs text-gray-500">Duplicates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{importResult.errorCount}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="max-h-24 overflow-auto bg-dark-800/50 rounded p-2">
                {importResult.errors.map((error, i) => (
                  <p key={i} className="text-sm text-red-400 flex items-start gap-2 py-1">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setImportResult(null)}
              className="text-sm text-gray-400 hover:text-gray-300 mt-2"
            >
              Dismiss
            </button>
          </GlassCard>
        )}

        {/* Export Section */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export ADIF
            </h4>
            <button
              onClick={() => setShowExportFilters(!showExportFilters)}
              className={`glass-button p-2 ${showExportFilters ? 'bg-accent-primary/20' : ''}`}
              title="Export filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Export Filters */}
          {showExportFilters && (
            <div className="space-y-3 mb-4 p-3 bg-dark-700/50 rounded-lg">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Callsign</label>
                  <input
                    type="text"
                    value={exportCallsign}
                    onChange={e => setExportCallsign(e.target.value.toUpperCase())}
                    placeholder="Filter by callsign"
                    className="glass-input w-full text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Band</label>
                  <select
                    value={exportBand}
                    onChange={e => setExportBand(e.target.value)}
                    className="glass-input w-full text-sm"
                  >
                    <option value="">All bands</option>
                    <option value="160m">160m</option>
                    <option value="80m">80m</option>
                    <option value="40m">40m</option>
                    <option value="30m">30m</option>
                    <option value="20m">20m</option>
                    <option value="17m">17m</option>
                    <option value="15m">15m</option>
                    <option value="12m">12m</option>
                    <option value="10m">10m</option>
                    <option value="6m">6m</option>
                    <option value="2m">2m</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mode</label>
                  <select
                    value={exportMode}
                    onChange={e => setExportMode(e.target.value)}
                    className="glass-input w-full text-sm"
                  >
                    <option value="">All modes</option>
                    <option value="SSB">SSB</option>
                    <option value="CW">CW</option>
                    <option value="FT8">FT8</option>
                    <option value="FT4">FT4</option>
                    <option value="RTTY">RTTY</option>
                    <option value="PSK31">PSK31</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">From:</label>
                  <input
                    type="date"
                    value={exportFromDate}
                    onChange={e => setExportFromDate(e.target.value)}
                    className="glass-input px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">To:</label>
                  <input
                    type="date"
                    value={exportToDate}
                    onChange={e => setExportToDate(e.target.value)}
                    className="glass-input px-2 py-1 text-sm"
                  />
                </div>
                {hasExportFilters && (
                  <button
                    onClick={clearExportFilters}
                    className="text-sm text-red-400 hover:text-red-300 ml-auto"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="w-full glass-button py-3 bg-accent-success/20 hover:bg-accent-success/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Export {hasExportFilters ? 'Filtered' : 'All'} QSOs to ADIF
              </>
            )}
          </button>

          {hasExportFilters && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Filters are applied to export
            </p>
          )}
        </GlassCard>

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>ADIF (Amateur Data Interchange Format) is the standard format for exchanging amateur radio log data.</p>
          <p>Imported QSOs are automatically saved to MongoDB and synced with connected clients.</p>
        </div>
      </div>
    </GlassPanel>
  );
}
