import React from 'react';
import { ShieldCheck, Cpu, WifiOff, RefreshCw } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';
import { getEndpointDisplayUrl } from '../services/api';

export const Navbar: React.FC = () => {
  const { isOnline, isChecking, latencyMs, checkHealth } = useBackendStatus();

  return (
    <header className="bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/80 sticky top-0 z-50 px-5 sm:px-8 py-3.5 flex items-center justify-between shadow-xl shadow-black/40">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
          <div className="relative bg-slate-900 border border-cyan-500/40 p-2.5 rounded-xl text-cyan-400 shadow-inner flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-heading">
              NEURAL FACIAL FORENSICS
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              IEEE FORENSICS v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Multimodal Deepfake Detection & Synthetic Media Inconsistency Verification
          </p>
        </div>
      </div>

      {/* Right Telemetry & Status Badges */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Engine Spec Badge */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 shadow-inner">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px]">Engine: <strong className="text-slate-100 font-mono font-semibold">PyTorch CPU • XNNPACK</strong></span>
        </div>

        {/* Live Backend Telemetry Pill */}
        {isChecking && !isOnline ? (
          <button
            onClick={() => checkHealth()}
            title="Attempting to establish handshake with inference server..."
            className="flex items-center space-x-2 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span className="font-semibold text-[11px] font-mono">Pinging Server...</span>
          </button>
        ) : isOnline ? (
          <button
            onClick={() => checkHealth()}
            title={`Backend operational at ${getEndpointDisplayUrl()} (Round-trip: ${latencyMs ?? 0}ms). Click to ping.`}
            className="flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer shadow-xs group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px]">System Online</span>
            {latencyMs !== null && (
              <span className="text-[10px] text-emerald-400/80 border-l border-emerald-500/30 pl-2 font-mono">
                {latencyMs}ms
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => checkHealth()}
            title="FastAPI server disconnected! Click to retry connection."
            className="flex items-center space-x-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 px-3.5 py-1.5 rounded-xl border border-rose-500/40 transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse"
          >
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-[11px]">Backend Offline</span>
            <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-mono font-bold">
              Reconnect
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
