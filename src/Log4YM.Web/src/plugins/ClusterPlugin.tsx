import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radio, Zap, Clock, Globe, Volume2, VolumeX, Filter } from 'lucide-react';
import { api, Spot } from '../api/client';
import { useSignalR } from '../hooks/useSignalR';
import { GlassPanel } from '../components/GlassPanel';

const BAND_RANGES: Record<string, [number, number]> = {
  '160m': [1800, 2000],
  '80m': [3500, 4000],
  '40m': [7000, 7300],
  '30m': [10100, 10150],
  '20m': [14000, 14350],
  '17m': [18068, 18168],
  '15m': [21000, 21450],
  '12m': [24890, 24990],
  '10m': [28000, 29700],
  '6m': [50000, 54000],
};

export function ClusterPlugin() {
  const { selectSpot } = useSignalR();
  const [selectedBand, setSelectedBand] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const { data: spots, isLoading } = useQuery({
    queryKey: ['spots', selectedBand, selectedMode],
    queryFn: () => api.getSpots({
      band: selectedBand || undefined,
      mode: selectedMode || undefined,
      limit: 100,
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getBandFromFrequency = (freq: number): string => {
    for (const [band, [min, max]] of Object.entries(BAND_RANGES)) {
      if (freq >= min && freq <= max) {
        return band;
      }
    }
    return '?';
  };

  const getModeClass = (mode: string) => {
    switch (mode?.toUpperCase()) {
      case 'CW': return 'badge-cw';
      case 'SSB':
      case 'USB':
      case 'LSB': return 'badge-ssb';
      case 'FT8':
      case 'FT4': return 'badge-ft8';
      case 'RTTY':
      case 'PSK31': return 'badge-rtty';
      default: return 'bg-dark-600 text-gray-300';
    }
  };

  const formatFrequency = (freq: number) => {
    return (freq / 1000).toFixed(3);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().slice(11, 16);
  };

  const getAge = (dateStr: string) => {
    const now = new Date();
    const spotted = new Date(dateStr);
    const minutes = Math.floor((now.getTime() - spotted.getTime()) / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  };

  const handleSpotClick = async (spot: Spot) => {
    await selectSpot(spot.dxCall, spot.frequency, spot.mode);
  };

  const filteredSpots = spots?.filter(spot => {
    if (selectedBand) {
      const band = getBandFromFrequency(spot.frequency);
      if (band !== selectedBand) return false;
    }
    if (selectedMode && spot.mode?.toUpperCase() !== selectedMode.toUpperCase()) {
      return false;
    }
    return true;
  });

  return (
    <GlassPanel
      title="DX Cluster"
      icon={<Zap className="w-5 h-5" />}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {filteredSpots?.length || 0} spots
          </span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`glass-button p-1.5 ${soundEnabled ? 'text-accent-success' : 'text-gray-500'}`}
            title={soundEnabled ? 'Disable alerts' : 'Enable alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="glass-input flex-1"
          >
            <option value="">All Bands</option>
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
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="glass-input flex-1"
          >
            <option value="">All Modes</option>
            <option value="CW">CW</option>
            <option value="SSB">SSB</option>
            <option value="FT8">FT8</option>
            <option value="RTTY">RTTY</option>
          </select>

          <button className="glass-button p-2" title="Advanced filters">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Spots List */}
        <div className="space-y-2 overflow-auto max-h-[calc(100vh-280px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Radio className="w-4 h-4 animate-spin mr-2" />
              Loading spots...
            </div>
          ) : filteredSpots?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No spots available
            </div>
          ) : (
            filteredSpots?.map((spot) => (
              <div
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                className="bg-dark-700/50 rounded-lg p-3 border border-glass-100 hover:border-accent-primary/50 hover:bg-dark-600/50 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent-primary group-hover:text-accent-secondary transition-colors">
                        {spot.dxCall}
                      </span>
                      {spot.mode && (
                        <span className={`badge text-xs ${getModeClass(spot.mode)}`}>
                          {spot.mode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="frequency-display text-accent-info">
                        {formatFrequency(spot.frequency)} MHz
                      </span>
                      <span className="text-gray-500 font-mono">
                        {getBandFromFrequency(spot.frequency)}
                      </span>
                    </div>

                    {spot.comment && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {spot.comment}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(spot.time)}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {getAge(spot.time)}
                    </div>
                    {spot.country && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{spot.country}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-50 text-xs text-gray-600">
                  <span>Spotter: {spot.spotter}</span>
                  {spot.source && (
                    <span className="text-gray-700">{spot.source}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
