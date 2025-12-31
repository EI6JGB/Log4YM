import { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Server,
  Radio,
} from 'lucide-react';
import { useSetupStore } from '../store/setupStore';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const {
    connectionString,
    databaseName,
    setConnectionString,
    setDatabaseName,
    testConnection,
    configure,
    isTesting,
    isLoading,
    testResult,
    error,
    clearError,
    clearTestResult,
  } = useSetupStore();

  const [showConnectionString, setShowConnectionString] = useState(false);
  const [step, setStep] = useState<'input' | 'tested' | 'success'>('input');

  // Reset to input step when connection string changes
  useEffect(() => {
    if (step === 'tested') {
      setStep('input');
      clearTestResult();
    }
  }, [connectionString, databaseName]);

  const handleTest = async () => {
    clearError();
    const success = await testConnection();
    if (success) {
      setStep('tested');
    }
  };

  const handleConfigure = async () => {
    const success = await configure();
    if (success) {
      setStep('success');
      // Delay before proceeding to main app
      setTimeout(onComplete, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-[200]">
      <div className="glass-panel w-full max-w-lg mx-4 animate-fade-in border border-glass-200 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-glass-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Radio className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-orange-500">LOG4YM</h1>
              <p className="text-sm text-gray-400">Welcome! Let's get you set up.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Setup Complete!</h2>
              <p className="text-gray-400">Connected to MongoDB successfully. Starting Log4YM...</p>
            </div>
          ) : (
            <>
              {/* Database Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-accent-primary" />
                  <h2 className="text-lg font-semibold text-gray-100">Database Configuration</h2>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                  Log4YM uses MongoDB to store your QSOs and settings. You can use a free MongoDB
                  Atlas cluster or a local MongoDB installation.
                </p>

                {/* MongoDB Atlas link */}
                <a
                  href="https://www.mongodb.com/atlas/database"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent-primary hover:underline mb-6"
                >
                  <ExternalLink className="w-4 h-4" />
                  Get a free MongoDB Atlas cluster
                </a>

                {/* Connection String Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <Server className="w-4 h-4 text-accent-primary" />
                      MongoDB Connection String
                    </label>
                    <div className="relative">
                      <input
                        type={showConnectionString ? 'text' : 'password'}
                        value={connectionString}
                        onChange={(e) => setConnectionString(e.target.value)}
                        placeholder="mongodb+srv://user:password@cluster.mongodb.net/"
                        className="glass-input w-full pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConnectionString(!showConnectionString)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
                      >
                        {showConnectionString ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Your connection string is stored locally and never sent anywhere except
                      MongoDB.
                    </p>
                  </div>

                  {/* Database Name Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Database Name</label>
                    <input
                      type="text"
                      value={databaseName}
                      onChange={(e) => setDatabaseName(e.target.value)}
                      placeholder="Log4YM"
                      className="glass-input w-full font-mono"
                    />
                    <p className="text-xs text-gray-600">
                      The database will be created automatically if it doesn't exist.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    testResult.success
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          testResult.success ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {testResult.message}
                      </p>
                      {testResult.serverInfo && (
                        <p className="text-sm text-gray-400 mt-1">
                          Found {testResult.serverInfo.databaseCount} database(s) on server
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400">{error}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'success' && (
          <div className="p-6 border-t border-glass-100 flex justify-end gap-3">
            {step === 'input' ? (
              <button
                onClick={handleTest}
                disabled={!connectionString || isTesting}
                className="glass-button-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Test Connection
                  </>
                )}
              </button>
            ) : (
              <>
                <button onClick={() => setStep('input')} className="glass-button px-6 py-2">
                  Back
                </button>
                <button
                  onClick={handleConfigure}
                  disabled={isLoading}
                  className="glass-button-success px-6 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save & Continue
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
