import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Simple obfuscation for credentials (not secure, just basic hiding)
const obfuscate = (text: string): string => {
  if (!text) return '';
  return btoa(text.split('').reverse().join(''));
};

const deobfuscate = (text: string): string => {
  if (!text) return '';
  try {
    return atob(text).split('').reverse().join('');
  } catch {
    return '';
  }
};

// Settings types
export interface StationSettings {
  callsign: string;
  operatorName: string;
  gridSquare: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
}

export interface QrzSettings {
  username: string;
  password: string; // Stored obfuscated
  enabled: boolean;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
}

export interface Settings {
  station: StationSettings;
  qrz: QrzSettings;
  appearance: AppearanceSettings;
}

export type SettingsSection = 'station' | 'qrz' | 'appearance' | 'about';

interface SettingsState {
  // Settings data
  settings: Settings;

  // UI state
  isOpen: boolean;
  activeSection: SettingsSection;
  isDirty: boolean;
  isSaving: boolean;

  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  setActiveSection: (section: SettingsSection) => void;

  // Settings updates
  updateStationSettings: (station: Partial<StationSettings>) => void;
  updateQrzSettings: (qrz: Partial<QrzSettings>) => void;
  updateAppearanceSettings: (appearance: Partial<AppearanceSettings>) => void;

  // QRZ credentials with obfuscation
  setQrzPassword: (password: string) => void;
  getQrzPassword: () => string;

  // Persistence
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  station: {
    callsign: '',
    operatorName: '',
    gridSquare: '',
    latitude: null,
    longitude: null,
    city: '',
    country: '',
  },
  qrz: {
    username: '',
    password: '',
    enabled: false,
  },
  appearance: {
    theme: 'dark',
    compactMode: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: defaultSettings,
      isOpen: false,
      activeSection: 'station',
      isDirty: false,
      isSaving: false,

      // UI actions
      openSettings: () => set({ isOpen: true }),
      closeSettings: () => set({ isOpen: false, isDirty: false }),
      setActiveSection: (section) => set({ activeSection: section }),

      // Station settings
      updateStationSettings: (station) =>
        set((state) => ({
          settings: {
            ...state.settings,
            station: { ...state.settings.station, ...station },
          },
          isDirty: true,
        })),

      // QRZ settings
      updateQrzSettings: (qrz) =>
        set((state) => ({
          settings: {
            ...state.settings,
            qrz: { ...state.settings.qrz, ...qrz },
          },
          isDirty: true,
        })),

      // Appearance settings
      updateAppearanceSettings: (appearance) =>
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...appearance },
          },
          isDirty: true,
        })),

      // QRZ password with obfuscation
      setQrzPassword: (password) =>
        set((state) => ({
          settings: {
            ...state.settings,
            qrz: { ...state.settings.qrz, password: obfuscate(password) },
          },
          isDirty: true,
        })),

      getQrzPassword: () => deobfuscate(get().settings.qrz.password),

      // Save to backend (MongoDB via API)
      saveSettings: async () => {
        set({ isSaving: true });
        try {
          const { settings } = get();
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
          });

          if (!response.ok) {
            throw new Error('Failed to save settings');
          }

          set({ isDirty: false });
        } catch (error) {
          console.error('Failed to save settings:', error);
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      // Load from backend
      loadSettings: async () => {
        try {
          const response = await fetch('/api/settings');
          if (response.ok) {
            const settings = await response.json();
            set({ settings, isDirty: false });
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      },

      // Reset to defaults
      resetSettings: () =>
        set({
          settings: defaultSettings,
          isDirty: true,
        }),
    }),
    {
      name: 'log4ym-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
