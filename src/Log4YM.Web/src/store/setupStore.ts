import { create } from 'zustand';

export interface SetupStatus {
  isConfigured: boolean;
  isConnected: boolean;
  configuredAt?: string;
  databaseName?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  serverInfo?: {
    databaseCount: number;
    availableDatabases: string[];
  };
}

interface SetupState {
  // Status
  status: SetupStatus | null;
  isLoading: boolean;
  error: string | null;

  // Form state
  connectionString: string;
  databaseName: string;

  // Test connection state
  isTesting: boolean;
  testResult: TestConnectionResult | null;

  // Actions
  setConnectionString: (value: string) => void;
  setDatabaseName: (value: string) => void;
  fetchStatus: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  configure: () => Promise<boolean>;
  clearError: () => void;
  clearTestResult: () => void;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  status: null,
  isLoading: false,
  error: null,
  connectionString: '',
  databaseName: 'Log4YM',
  isTesting: false,
  testResult: null,

  setConnectionString: (value) => set({ connectionString: value, testResult: null }),
  setDatabaseName: (value) => set({ databaseName: value }),
  clearError: () => set({ error: null }),
  clearTestResult: () => set({ testResult: null }),

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/setup/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const status = await response.json();
      set({ status, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch status',
        isLoading: false,
      });
    }
  },

  testConnection: async () => {
    const { connectionString, databaseName } = get();
    set({ isTesting: true, testResult: null, error: null });

    try {
      const response = await fetch('/api/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, databaseName }),
      });

      const result = await response.json();
      set({ testResult: result, isTesting: false });
      return result.success;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Connection test failed',
        isTesting: false,
      });
      return false;
    }
  },

  configure: async () => {
    const { connectionString, databaseName } = get();
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/setup/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, databaseName }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh status
        await get().fetchStatus();
        return true;
      } else {
        set({ error: result.message, isLoading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Configuration failed',
        isLoading: false,
      });
      return false;
    }
  },
}));
