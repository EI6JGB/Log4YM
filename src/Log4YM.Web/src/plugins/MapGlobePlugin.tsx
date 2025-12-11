import { useState } from 'react';
import { Globe, Compass, Navigation, Target, RotateCw, MapPin, Maximize2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useSignalR } from '../hooks/useSignalR';
import { GlassPanel } from '../components/GlassPanel';

export function MapGlobePlugin() {
  const { stationGrid, rotatorPosition, focusedCallsignInfo } = useAppStore();
  const { commandRotator } = useSignalR();
  const [targetAzimuth, setTargetAzimuth] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = async () => {
    const azimuth = parseFloat(targetAzimuth);
    if (isNaN(azimuth) || azimuth < 0 || azimuth > 360) return;

    setIsRotating(true);
    try {
      await commandRotator(azimuth, 'map-globe');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRotateToTarget = async () => {
    if (!focusedCallsignInfo?.bearing) return;
    setIsRotating(true);
    try {
      await commandRotator(focusedCallsignInfo.bearing, 'map-globe');
    } finally {
      setIsRotating(false);
    }
  };

  // Placeholder compass visualization
  const CompassRose = () => (
    <div className="relative w-48 h-48 mx-auto">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-glass-200 bg-dark-800/50" />

      {/* Degree markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <div
          key={deg}
          className="absolute w-0.5 h-3 bg-glass-200"
          style={{
            left: '50%',
            top: '4px',
            transformOrigin: '50% 92px',
            transform: `translateX(-50%) rotate(${deg}deg)`,
          }}
        />
      ))}

      {/* Cardinal directions */}
      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-accent-danger">N</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">S</span>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">W</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">E</span>

      {/* Rotator needle */}
      <div
        className="absolute left-1/2 top-1/2 w-1 h-20 -mt-16 -ml-0.5 origin-bottom transition-transform duration-1000"
        style={{ transform: `rotate(${rotatorPosition?.currentAzimuth || 0}deg)` }}
      >
        <div className="w-full h-full bg-gradient-to-t from-accent-primary to-accent-secondary rounded-full" />
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent-primary rounded-full shadow-glow" />
      </div>

      {/* Target indicator */}
      {focusedCallsignInfo?.bearing && (
        <div
          className="absolute left-1/2 top-1/2 w-0.5 h-20 -mt-16 -ml-0.25 origin-bottom opacity-50"
          style={{ transform: `rotate(${focusedCallsignInfo.bearing}deg)` }}
        >
          <div className="w-full h-full bg-accent-warning rounded-full" />
        </div>
      )}

      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 w-4 h-4 -ml-2 -mt-2 bg-dark-700 border-2 border-glass-200 rounded-full" />

      {/* Azimuth display */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-8 text-center">
        <span className="text-2xl font-mono font-bold text-accent-primary">
          {rotatorPosition?.currentAzimuth?.toFixed(0) || '---'}°
        </span>
      </div>
    </div>
  );

  return (
    <GlassPanel
      title="Map & Rotator"
      icon={<Globe className="w-5 h-5" />}
      actions={
        <button className="glass-button p-1.5" title="Fullscreen">
          <Maximize2 className="w-4 h-4" />
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Map placeholder */}
        <div className="relative aspect-video bg-dark-800/50 rounded-lg border border-glass-100 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Map visualization</p>
              <p className="text-xs text-gray-700">Leaflet integration pending</p>
            </div>
          </div>

          {/* Station marker overlay */}
          {stationGrid && (
            <div className="absolute bottom-2 left-2 glass-panel px-2 py-1 text-xs">
              <div className="flex items-center gap-1 text-accent-primary">
                <MapPin className="w-3 h-3" />
                <span className="font-mono">{stationGrid}</span>
              </div>
            </div>
          )}

          {/* Target info overlay */}
          {focusedCallsignInfo && (
            <div className="absolute top-2 right-2 glass-panel px-3 py-2">
              <p className="font-mono font-bold text-accent-secondary">
                {focusedCallsignInfo.callsign}
              </p>
              {focusedCallsignInfo.grid && (
                <p className="text-xs text-gray-400">{focusedCallsignInfo.grid}</p>
              )}
              {focusedCallsignInfo.distance && (
                <p className="text-xs text-accent-info">
                  {focusedCallsignInfo.distance.toFixed(0)} km
                </p>
              )}
            </div>
          )}
        </div>

        {/* Compass Rose */}
        <div className="py-4">
          <CompassRose />
        </div>

        {/* Rotator Controls */}
        <div className="space-y-3 border-t border-glass-100 pt-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400">Rotator Control</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Manual azimuth input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Target Azimuth</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={targetAzimuth}
                  onChange={(e) => setTargetAzimuth(e.target.value)}
                  placeholder="0-360"
                  className="glass-input w-full font-mono text-center"
                />
                <button
                  onClick={handleRotate}
                  disabled={isRotating || !targetAzimuth}
                  className="glass-button px-3 disabled:opacity-50"
                  title="Rotate to azimuth"
                >
                  <Navigation className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Rotate to target */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Target Bearing</label>
              <button
                onClick={handleRotateToTarget}
                disabled={isRotating || !focusedCallsignInfo?.bearing}
                className="glass-button-success w-full flex items-center justify-center gap-2 py-2 disabled:opacity-50"
              >
                <Target className="w-4 h-4" />
                <span className="font-mono">
                  {focusedCallsignInfo?.bearing?.toFixed(0) || '---'}°
                </span>
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => {
                  setTargetAzimuth(deg.toString());
                }}
                className="glass-button flex-1 text-xs py-1 font-mono"
              >
                {deg}°
              </button>
            ))}
          </div>

          {/* Status */}
          {rotatorPosition && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-glass-50">
              <span>Current: {rotatorPosition.currentAzimuth?.toFixed(1)}°</span>
              {rotatorPosition.targetAzimuth !== undefined && (
                <span className="text-accent-warning flex items-center gap-1">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  Target: {rotatorPosition.targetAzimuth?.toFixed(1)}°
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
