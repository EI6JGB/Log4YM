import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Search, User, MapPin, Radio, Link, Unlink } from 'lucide-react';
import { api, CreateQsoRequest } from '../api/client';
import { useSignalR } from '../hooks/useSignalR';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { GlassPanel } from '../components/GlassPanel';
import { getCountryFlag } from '../core/countryFlags';

const BANDS = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '70cm'];
const MODES = ['SSB', 'CW', 'FT8', 'FT4', 'RTTY', 'PSK31', 'AM', 'FM'];

export function LogEntryPlugin() {
  const queryClient = useQueryClient();
  const { focusCallsign } = useSignalR();
  const { focusedCallsignInfo, radioStates, selectedRadioId } = useAppStore();
  const { settings, updateRadioSettings } = useSettingsStore();
  const followRadio = settings.radio.followRadio;

  const [formData, setFormData] = useState({
    callsign: '',
    band: '20m',
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    frequency: '',
    name: '',
    grid: '',
    comment: '',
  });

  // Get current radio state
  const currentRadioState = selectedRadioId ? radioStates.get(selectedRadioId) : null;

  // Auto-populate from radio state when followRadio is enabled
  useEffect(() => {
    if (followRadio && currentRadioState) {
      const frequencyKhz = (currentRadioState.frequencyHz / 1000).toFixed(3);
      setFormData(prev => ({
        ...prev,
        frequency: frequencyKhz,
        band: currentRadioState.band || prev.band,
        mode: normalizeMode(currentRadioState.mode) || prev.mode,
      }));
    }
  }, [followRadio, currentRadioState?.frequencyHz, currentRadioState?.band, currentRadioState?.mode]);

  // Normalize mode names from radio to match our MODES list
  const normalizeMode = (mode: string): string => {
    const upperMode = mode?.toUpperCase() || '';
    // Map common variations
    if (upperMode.includes('LSB') || upperMode.includes('USB')) return 'SSB';
    if (upperMode.includes('CW')) return 'CW';
    if (upperMode.includes('FT8')) return 'FT8';
    if (upperMode.includes('FT4')) return 'FT4';
    if (upperMode.includes('RTTY') || upperMode.includes('FSK')) return 'RTTY';
    if (upperMode.includes('PSK')) return 'PSK31';
    if (upperMode.includes('AM')) return 'AM';
    if (upperMode.includes('FM') || upperMode.includes('NFM')) return 'FM';
    // Return original if in list, otherwise default
    return MODES.includes(upperMode) ? upperMode : 'SSB';
  };

  const toggleFollowRadio = () => {
    updateRadioSettings({ followRadio: !followRadio });
  };

  const createQso = useMutation({
    mutationFn: (data: CreateQsoRequest) => api.createQso(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qsos'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      // Clear form
      setFormData({
        ...formData,
        callsign: '',
        name: '',
        grid: '',
        comment: '',
        frequency: '',
      });
    },
  });

  const handleCallsignChange = useCallback(async (value: string) => {
    const callsign = value.toUpperCase();
    setFormData(prev => ({ ...prev, callsign }));

    if (callsign.length >= 3) {
      await focusCallsign(callsign, 'log-entry');
    }
  }, [focusCallsign]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.callsign) return;

    const now = new Date();
    createQso.mutate({
      callsign: formData.callsign,
      qsoDate: now.toISOString(),
      timeOn: now.toISOString().slice(11, 19).replace(/:/g, ''),
      band: formData.band,
      mode: formData.mode,
      frequency: formData.frequency ? parseFloat(formData.frequency) : undefined,
      rstSent: formData.rstSent,
      rstRcvd: formData.rstRcvd,
      name: formData.name || focusedCallsignInfo?.name,
      grid: formData.grid || focusedCallsignInfo?.grid,
      country: focusedCallsignInfo?.country,
      comment: formData.comment,
    });
  };

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

  return (
    <GlassPanel
      title="Log Entry"
      icon={<Radio className="w-5 h-5" />}
      actions={
        <button
          type="button"
          onClick={toggleFollowRadio}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-all ${
            followRadio
              ? 'bg-accent-success/20 text-accent-success hover:bg-accent-success/30'
              : 'bg-dark-600 text-gray-400 hover:bg-dark-500'
          }`}
          title={followRadio ? 'Following radio frequency' : 'Not following radio'}
        >
          {followRadio ? (
            <>
              <Link className="w-3.5 h-3.5" />
              <span>Following</span>
            </>
          ) : (
            <>
              <Unlink className="w-3.5 h-3.5" />
              <span>Manual</span>
            </>
          )}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Callsign Input */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Callsign
          </label>
          <input
            type="text"
            value={formData.callsign}
            onChange={(e) => handleCallsignChange(e.target.value)}
            placeholder="Enter callsign..."
            className="glass-input w-full text-xl font-mono font-bold tracking-wider uppercase"
            autoFocus
          />
        </div>

        {/* Callsign Info Card */}
        {focusedCallsignInfo && formData.callsign && (
          <div className="bg-dark-700/50 rounded-lg p-3 border border-glass-100 animate-fade-in">
            <div className="flex items-start gap-3">
              {focusedCallsignInfo.imageUrl ? (
                <img
                  src={focusedCallsignInfo.imageUrl}
                  alt={focusedCallsignInfo.callsign}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-dark-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100 truncate">
                  {focusedCallsignInfo.name || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-base">{getCountryFlag(focusedCallsignInfo.country) || '🏳️'}</span>
                  <span className="truncate">{focusedCallsignInfo.country}</span>
                </div>
                {focusedCallsignInfo.grid && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span className="font-mono">{focusedCallsignInfo.grid}</span>
                  </div>
                )}
              </div>
              {/* Large country flag display */}
              <div className="text-4xl" title={focusedCallsignInfo.country || 'Unknown country'}>
                {getCountryFlag(focusedCallsignInfo.country, '🇮🇪')}
              </div>
            </div>
          </div>
        )}

        {/* Band and Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              Band
              {followRadio && currentRadioState && (
                <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" title="From radio" />
              )}
            </label>
            <select
              value={formData.band}
              onChange={(e) => setFormData(prev => ({ ...prev, band: e.target.value }))}
              className={`glass-input w-full ${
                followRadio && currentRadioState ? 'border-accent-success/30' : ''
              }`}
            >
              {BANDS.map(band => (
                <option key={band} value={band}>{band}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              Mode
              {followRadio && currentRadioState && (
                <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" title="From radio" />
              )}
            </label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
              className={`glass-input w-full ${
                followRadio && currentRadioState ? 'border-accent-success/30' : ''
              }`}
            >
              {MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="flex justify-center">
          <span className={`badge text-lg px-4 py-1 ${getModeClass(formData.mode)}`}>
            {formData.mode}
          </span>
        </div>

        {/* RST */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">RST Sent</label>
            <input
              type="text"
              value={formData.rstSent}
              onChange={(e) => setFormData(prev => ({ ...prev, rstSent: e.target.value }))}
              className="glass-input w-full font-mono text-center"
              maxLength={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">RST Rcvd</label>
            <input
              type="text"
              value={formData.rstRcvd}
              onChange={(e) => setFormData(prev => ({ ...prev, rstRcvd: e.target.value }))}
              className="glass-input w-full font-mono text-center"
              maxLength={3}
            />
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            Frequency (kHz)
            {followRadio && currentRadioState && (
              <span className="flex items-center gap-1 text-xs text-accent-success">
                <Link className="w-3 h-3" />
                Radio
              </span>
            )}
          </label>
          <input
            type="text"
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
            placeholder="14250"
            className={`glass-input w-full font-mono ${
              followRadio && currentRadioState ? 'border-accent-success/30' : ''
            }`}
            readOnly={followRadio && !!currentRadioState}
          />
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Comment</label>
          <input
            type="text"
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Notes..."
            className="glass-input w-full"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!formData.callsign || createQso.isPending}
          className="glass-button-success w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {createQso.isPending ? 'Logging...' : 'Log QSO'}
        </button>
      </form>
    </GlassPanel>
  );
}
