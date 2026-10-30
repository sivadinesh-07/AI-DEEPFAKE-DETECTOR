import React, { useState } from 'react';
import { WifiOff, RefreshCw, Copy, Check, Terminal, ChevronDown, ChevronUp, AlertOctagon } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';
import { getEndpointDisplayUrl } from '../services/api';

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
      className="bg-slate-950/90 border-b border-rose-500/30 text-rose-200 px-4 sm:px-6 py-3 shadow-2xl backdrop-blur-xl sticky top-[57px] z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 shrink-0 mt-0.5 sm:mt-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <WifiOff className="w-4 h-4 animate-pulse text-rose-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5 text-xs sm:text-sm font-heading">
                <AlertOctagon className="w-4 h-4 text-rose-400 inline" />
                Backend Inference Server Disconnected
              </span>
              <span className="bg-rose-500/20 text-rose-300 text-[10px] uppercase tracking-wider font-mono font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">
                Port 8000 Inactive
              </span>
            </div>
            {!minimized && (
              <p className="text-[11px] text-slate-300 mt-0.5 max-w-2xl leading-relaxed font-sans">
                The FastAPI inference backend at <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-[10px] border border-slate-700">{getEndpointDisplayUrl()}</code> is currently unreachable. Start it to process video audits and generate Grad-CAM dossiers.
              </p>
            )}
          </div>
        </div>

        {/* Right Actions & Command */}
        <div className="flex items-center space-x-2.5 self-stretch sm:self-auto justify-end">
          {!minimized && (
            <div className="hidden lg:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[280px] text-[11px] text-slate-300">{startCmd}</span>
              <button
                onClick={handleCopy}
                title="Copy launch command"
                className="ml-1 p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <button
            onClick={() => checkHealth()}
            disabled={isChecking}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/30 flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Retry Handshake'}</span>
          </button>

          <button
            onClick={() => setMinimized(!minimized)}
            title={minimized ? 'Expand details' : 'Collapse details'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
