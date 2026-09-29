import React, { useState } from 'react';
import { WifiOff, RefreshCw, Copy, Check, Terminal, ChevronDown, ChevronUp, AlertOctagon } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isChecking, checkHealth } = useBackendStatus();
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (isOnline) {
    return null;
  }

  const startCmd = 'python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000';

  const handleCopy = () => {
    navigator.clipboard.writeText(startCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="bg-rose-50/95 border-b border-rose-200 text-rose-900 px-4 sm:px-6 py-3 shadow-xs backdrop-blur-md sticky top-[61px] z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-2 bg-rose-100 border border-rose-200 rounded-xl text-rose-600 shrink-0 mt-0.5 sm:mt-0">
            <WifiOff className="w-5 h-5 animate-pulse text-rose-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-950 tracking-tight flex items-center gap-1.5 text-sm sm:text-base">
                <AlertOctagon className="w-4 h-4 text-rose-600 inline" />
                Backend Server Offline
              </span>
              <span className="bg-rose-100 text-rose-700 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border border-rose-200">
                Connection Refused
              </span>
            </div>
            {!minimized && (
              <p className="text-xs text-rose-800/90 mt-0.5 max-w-2xl leading-relaxed">
                The Python FastAPI server at <code className="bg-rose-100/90 px-1.5 py-0.5 rounded text-rose-900 font-mono text-[11px] border border-rose-300">http://127.0.0.1:8000</code> is not reachable. Launch it to run inferences or view forensic dossiers.
              </p>
            )}
          </div>
        </div>

        {/* Right Actions & Command */}
        <div className="flex items-center space-x-2.5 self-stretch sm:self-auto justify-end">
          {!minimized && (
            <div className="hidden lg:flex items-center space-x-1.5 bg-white border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-950 shadow-xs">
              <Terminal className="w-3.5 h-3.5 text-rose-600" />
              <span className="truncate max-w-[280px]">{startCmd}</span>
              <button
                onClick={handleCopy}
                title="Copy launch command"
                className="ml-1 p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-950 rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#15B392]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <button
            onClick={() => checkHealth()}
            disabled={isChecking}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Retry Connection'}</span>
          </button>

          <button
            onClick={() => setMinimized(!minimized)}
            title={minimized ? 'Expand details' : 'Collapse details'}
            className="p-1.5 text-rose-700 hover:text-rose-950 hover:bg-rose-100 rounded-lg transition-colors"
          >
            {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
