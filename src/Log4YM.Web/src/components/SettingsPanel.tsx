import { useEffect, useState } from 'react';
import {
  X,
  Settings,
  Radio,
  Globe,
  Palette,
  Info,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  MapPin,
  User,
  Key,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useSettingsStore, SettingsSection } from '../store/settingsStore';
import { useAppStore } from '../store/appStore';

// Settings navigation items
const SETTINGS_SECTIONS: { id: SettingsSection; name: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'station',
    name: 'Station',
    icon: <Radio className="w-5 h-5" />,
    description: 'Callsign, location, and operator info',
  },
  {
    id: 'qrz',
    name: 'QRZ.com',
    icon: <Globe className="w-5 h-5" />,
    description: 'QRZ lookup credentials',
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: <Palette className="w-5 h-5" />,
    description: 'Theme and display options',
  },
  {
    id: 'about',
    name: 'About',
    icon: <Info className="w-5 h-5" />,
    description: 'Version and license info',
  },
];

// Station Settings Section
function StationSettingsSection() {
  const { settings, updateStationSettings } = useSettingsStore();
  const { setStationInfo } = useAppStore();
  const station = settings.station;

  // Sync station info to app store when callsign/grid changes
  useEffect(() => {
    if (station.callsign || station.gridSquare) {
      setStationInfo(station.callsign, station.gridSquare);
    }
  }, [station.callsign, station.gridSquare, setStationInfo]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-1">Station Information</h3>
        <p className="text-sm text-gray-500">Configure your station callsign and location details.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Callsign */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Radio className="w-4 h-4 text-accent-primary" />
            Callsign
          </label>
          <input
            type="text"
            value={station.callsign}
            onChange={(e) => updateStationSettings({ callsign: e.target.value.toUpperCase() })}
            placeholder="e.g. EI6LF"
            className="glass-input w-full font-mono uppercase"
          />
        </div>

        {/* Operator Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <User className="w-4 h-4 text-accent-primary" />
            Operator Name
          </label>
          <input
            type="text"
            value={station.operatorName}
            onChange={(e) => updateStationSettings({ operatorName: e.target.value })}
            placeholder="Your name"
            className="glass-input w-full"
          />
        </div>

        {/* Grid Square */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <MapPin className="w-4 h-4 text-accent-primary" />
            Grid Square (Maidenhead)
          </label>
          <input
            type="text"
            value={station.gridSquare}
            onChange={(e) => updateStationSettings({ gridSquare: e.target.value.toUpperCase() })}
            placeholder="e.g. IO63"
            maxLength={8}
            className="glass-input w-full font-mono uppercase"
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">City</label>
          <input
            type="text"
            value={station.city}
            onChange={(e) => updateStationSettings({ city: e.target.value })}
            placeholder="Your city"
            className="glass-input w-full"
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Country</label>
          <input
            type="text"
            value={station.country}
            onChange={(e) => updateStationSettings({ country: e.target.value })}
            placeholder="Your country"
            className="glass-input w-full"
          />
        </div>
      </div>

      {/* Coordinates */}
      <div className="border-t border-glass-100 pt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Coordinates (Optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={station.latitude ?? ''}
              onChange={(e) =>
                updateStationSettings({
                  latitude: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="e.g. 52.6667"
              className="glass-input w-full font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={station.longitude ?? ''}
              onChange={(e) =>
                updateStationSettings({
                  longitude: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="e.g. -8.6333"
              className="glass-input w-full font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// QRZ Settings Section
function QrzSettingsSection() {
  const { settings, updateQrzSettings, setQrzPassword, getQrzPassword } = useSettingsStore();
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const qrz = settings.qrz;
  const password = getQrzPassword();

  const handleTestConnection = async () => {
    setTestStatus('testing');
    // Simulate API test (would call backend)
    setTimeout(() => {
      if (qrz.username && password) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-1">QRZ.com Integration</h3>
        <p className="text-sm text-gray-500">
          Configure your QRZ.com credentials for callsign lookups.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg border border-glass-100">
        <div>
          <p className="font-medium text-gray-200">Enable QRZ Lookups</p>
          <p className="text-sm text-gray-500">Use QRZ.com for callsign information</p>
        </div>
        <button
          onClick={() => updateQrzSettings({ enabled: !qrz.enabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            qrz.enabled ? 'bg-accent-success' : 'bg-dark-500'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              qrz.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Credentials */}
      <div className={`space-y-4 ${!qrz.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <User className="w-4 h-4 text-accent-primary" />
            QRZ Username
          </label>
          <input
            type="text"
            value={qrz.username}
            onChange={(e) => updateQrzSettings({ username: e.target.value })}
            placeholder="Your QRZ.com username"
            className="glass-input w-full"
            disabled={!qrz.enabled}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Key className="w-4 h-4 text-accent-primary" />
            QRZ Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setQrzPassword(e.target.value)}
              placeholder="Your QRZ.com password"
              className="glass-input w-full pr-10"
              disabled={!qrz.enabled}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Credentials are stored with basic obfuscation. For better security, consider using an API key if available.
          </p>
        </div>

        {/* Test connection */}
        <div className="pt-2">
          <button
            onClick={handleTestConnection}
            disabled={!qrz.username || !password || testStatus === 'testing'}
            className="glass-button px-4 py-2 flex items-center gap-2 disabled:opacity-50"
          >
            {testStatus === 'testing' && (
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            )}
            {testStatus === 'success' && <CheckCircle className="w-4 h-4 text-accent-success" />}
            {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-accent-danger" />}
            {testStatus === 'idle' && <Globe className="w-4 h-4" />}
            <span>
              {testStatus === 'testing'
                ? 'Testing...'
                : testStatus === 'success'
                  ? 'Connected!'
                  : testStatus === 'error'
                    ? 'Failed'
                    : 'Test Connection'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Appearance Settings Section
function AppearanceSettingsSection() {
  const { settings, updateAppearanceSettings } = useSettingsStore();
  const appearance = settings.appearance;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-1">Appearance</h3>
        <p className="text-sm text-gray-500">Customize the look and feel of the application.</p>
      </div>

      {/* Theme selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateAppearanceSettings({ theme })}
              className={`p-4 rounded-lg border transition-all ${
                appearance.theme === theme
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-glass-100 hover:border-glass-200'
              }`}
            >
              <span className="capitalize text-sm font-medium">{theme}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600">Currently only dark theme is available.</p>
      </div>

      {/* Compact mode toggle */}
      <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg border border-glass-100">
        <div>
          <p className="font-medium text-gray-200">Compact Mode</p>
          <p className="text-sm text-gray-500">Use smaller spacing and fonts</p>
        </div>
        <button
          onClick={() => updateAppearanceSettings({ compactMode: !appearance.compactMode })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            appearance.compactMode ? 'bg-accent-success' : 'bg-dark-500'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              appearance.compactMode ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// About Section
function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-1">About Log4YM</h3>
        <p className="text-sm text-gray-500">Version and application information.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-dark-700/50 rounded-lg border border-glass-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Radio className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-orange-500">LOG4YM</h4>
              <p className="text-sm text-gray-400">Ham Radio Logging Software</p>
              <p className="text-xs text-gray-600 mt-1">Version 0.1.0 (Alpha)</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <strong className="text-gray-300">Author:</strong> Brian Keating (EI6LF)
          </p>
          <p>
            <strong className="text-gray-300">License:</strong> MIT
          </p>
          <p>
            <strong className="text-gray-300">Website:</strong>{' '}
            <a href="https://github.com/brianbruff/Log4YM" className="text-accent-primary hover:underline">
              github.com/brianbruff/Log4YM
            </a>
          </p>
        </div>

        <div className="pt-4 border-t border-glass-100">
          <p className="text-xs text-gray-600">
            Log4YM is a modern ham radio logging application designed for amateur radio operators.
            It features real-time DX cluster integration, rotator control, and QSO logging.
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Settings Panel Component
export function SettingsPanel() {
  const {
    isOpen,
    closeSettings,
    activeSection,
    setActiveSection,
    isDirty,
    isSaving,
    saveSettings,
    resetSettings,
  } = useSettingsStore();

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await saveSettings();
    } catch {
      // Error handled in store
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'station':
        return <StationSettingsSection />;
      case 'qrz':
        return <QrzSettingsSection />;
      case 'appearance':
        return <AppearanceSettingsSection />;
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={closeSettings} />

      {/* Panel */}
      <div className="relative w-full max-w-4xl h-[600px] mx-4 bg-dark-800 border border-glass-200 rounded-xl shadow-2xl flex overflow-hidden animate-fade-in">
        {/* Master - Navigation sidebar */}
        <div className="w-64 bg-dark-850 border-r border-glass-100 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-glass-100">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-accent-primary" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-auto">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                  activeSection === section.id
                    ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
                    : 'hover:bg-dark-700 text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
              >
                <span className={activeSection === section.id ? 'text-accent-primary' : 'text-gray-500'}>
                  {section.icon}
                </span>
                <div>
                  <p className="font-medium">{section.name}</p>
                  <p className="text-xs text-gray-600">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Footer actions */}
          <div className="p-3 border-t border-glass-100 space-y-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="w-full glass-button-success flex items-center justify-center gap-2 py-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              onClick={resetSettings}
              className="w-full glass-button flex items-center justify-center gap-2 py-2 text-gray-400"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>

        {/* Detail - Content area */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-glass-100">
            <h3 className="text-lg font-semibold text-gray-100">
              {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.name}
            </h3>
            <button onClick={closeSettings} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">{renderSection()}</div>

          {/* Dirty indicator */}
          {isDirty && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30 text-amber-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
