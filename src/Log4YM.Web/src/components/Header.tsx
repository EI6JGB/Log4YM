import { Radio, Settings, Layout, Plus } from 'lucide-react';

interface HeaderProps {
  onAddPanel?: () => void;
}

export function Header({ onAddPanel }: HeaderProps) {
  return (
    <header className="h-14 bg-dark-800/90 backdrop-blur-xl border-b border-glass-100 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-glow">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="absolute inset-0 bg-accent-primary/20 rounded-xl radio-wave" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Log4YM
          </h1>
          <p className="text-xs text-gray-500 -mt-1">Amateur Radio Logging</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddPanel}
          className="glass-button flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Panel
        </button>

        <button className="glass-button p-2" title="Layout">
          <Layout className="w-4 h-4" />
        </button>

        <button className="glass-button p-2" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
