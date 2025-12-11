import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book, Search, Calendar, Globe, Radio, Filter } from 'lucide-react';
import { api } from '../api/client';
import { GlassPanel } from '../components/GlassPanel';

export function LogHistoryPlugin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBand, setSelectedBand] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');

  const { data: qsos, isLoading } = useQuery({
    queryKey: ['qsos', searchTerm, selectedBand, selectedMode],
    queryFn: () => api.getQsos({
      callsign: searchTerm || undefined,
      band: selectedBand || undefined,
      mode: selectedMode || undefined,
      limit: 100,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api.getStatistics(),
  });

  const getModeClass = (mode: string) => {
    switch (mode) {
      case 'CW': return 'badge-cw';
      case 'SSB': return 'badge-ssb';
      case 'FT8':
      case 'FT4': return 'badge-ft8';
      case 'RTTY':
      case 'PSK31': return 'badge-rtty';
      default: return 'bg-dark-600 text-gray-300';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const formatTime = (timeStr: string) => {
    if (timeStr.length === 6) {
      return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
    }
    return timeStr;
  };

  return (
    <GlassPanel
      title="Log History"
      icon={<Book className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{stats?.totalQsos || 0} QSOs</span>
          <span className="text-glass-100">|</span>
          <span>{stats?.uniqueCountries || 0} DXCC</span>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              placeholder="Search callsign..."
              className="glass-input w-full pl-10 font-mono"
            />
          </div>

          <select
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="glass-input w-24"
          >
            <option value="">Band</option>
            <option value="160m">160m</option>
            <option value="80m">80m</option>
            <option value="40m">40m</option>
            <option value="20m">20m</option>
            <option value="15m">15m</option>
            <option value="10m">10m</option>
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="glass-input w-24"
          >
            <option value="">Mode</option>
            <option value="SSB">SSB</option>
            <option value="CW">CW</option>
            <option value="FT8">FT8</option>
            <option value="RTTY">RTTY</option>
          </select>

          <button className="glass-button p-2" title="More filters">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* QSO Table */}
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-dark-800/95 backdrop-blur-sm">
              <tr className="text-left text-gray-400 border-b border-glass-100">
                <th className="py-2 px-3 font-medium">Date</th>
                <th className="py-2 px-3 font-medium">Time</th>
                <th className="py-2 px-3 font-medium">Callsign</th>
                <th className="py-2 px-3 font-medium">Band</th>
                <th className="py-2 px-3 font-medium">Mode</th>
                <th className="py-2 px-3 font-medium">RST S/R</th>
                <th className="py-2 px-3 font-medium">Name</th>
                <th className="py-2 px-3 font-medium">Country</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Radio className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : qsos?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No QSOs found
                  </td>
                </tr>
              ) : (
                qsos?.map((qso) => (
                  <tr
                    key={qso.id}
                    className="border-b border-glass-50 hover:bg-dark-700/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-3 text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(qso.qsoDate)}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-400">
                      {formatTime(qso.timeOn)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-accent-primary">
                      {qso.callsign}
                    </td>
                    <td className="py-2 px-3 font-mono text-accent-info">
                      {qso.band}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`badge text-xs ${getModeClass(qso.mode)}`}>
                        {qso.mode}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-400">
                      {qso.rstSent}/{qso.rstRcvd}
                    </td>
                    <td className="py-2 px-3 text-gray-300 truncate max-w-[120px]">
                      {qso.name || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{qso.country || '-'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats Footer */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-glass-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-primary">{stats.totalQsos}</p>
              <p className="text-xs text-gray-500">Total QSOs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-success">{stats.uniqueCountries}</p>
              <p className="text-xs text-gray-500">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-info">{stats.uniqueGrids}</p>
              <p className="text-xs text-gray-500">Grids</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-warning">{stats.qsosToday}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
