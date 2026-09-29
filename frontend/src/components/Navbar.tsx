import React from 'react';
import { ShieldAlert, Cpu, WifiOff, RefreshCw } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';

export const Navbar: React.FC = () => {
  const { isOnline, isChecking, latencyMs, checkHealth } = useBackendStatus();

  return (
    <header className="bg-white/85 backdrop-blur-xl border-b border-[#54C392]/25 sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-sm shadow-[#15B392]/5">
      <div className="flex items-center space-x-3.5">
        <div className="bg-gradient-to-br from-[#15B392]/15 to-[#73EC8B]/25 border border-[#54C392]/40 p-2.5 rounded-xl text-[#15B392] shadow-[0_0_15px_rgba(115,236,139,0.25)]">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-extrabold tracking-tight text-[#0b2922] font-sans">
              Neural Facial Media Forensics
            </h1>
            <span className="bg-[#D2FF72]/45 text-[#0c4739] text-[11px] px-2.5 py-0.5 rounded-full border border-[#73EC8B]/60 font-mono font-bold shadow-xs">
              IEEE Forensics v1.0
            </span>
          </div>
          <p className="text-xs text-[#205347]">Multimodal Deepfake Detection and Synthetic Media Verification</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-xs text-[#205347]">
        <div className="hidden sm:flex items-center space-x-2 bg-white/90 px-3 py-1.5 rounded-xl border border-[#54C392]/30 text-[#205347] shadow-xs">
          <Cpu className="w-3.5 h-3.5 text-[#15B392]" />
          <span>Engine: <strong className="text-[#0b2922] font-mono">PyTorch CPU / XNNPACK</strong></span>
        </div>

        {/* Real-Time Backend Status Pill */}
        {isChecking && !isOnline ? (
          <button
            onClick={() => checkHealth()}
            title="Attempting to connect to backend server..."
            className="flex items-center space-x-2 bg-amber-500/10 text-amber-600 px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span className="font-semibold">Connecting...</span>
          </button>
        ) : isOnline ? (
          <button
            onClick={() => checkHealth()}
            title={`Backend is reachable at http://127.0.0.1:8000 (Latency: ${latencyMs ?? 0}ms). Click to ping.`}
            className="flex items-center space-x-2 bg-[#73EC8B]/25 text-[#0b2922] hover:bg-[#73EC8B]/40 px-3.5 py-1.5 rounded-xl border border-[#54C392]/40 transition-all cursor-pointer shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15B392] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#15B392]"></span>
            </span>
            <span className="font-semibold text-[#0b2922]">Backend Online</span>
            {latencyMs !== null && (
              <span className="text-[10px] text-[#205347] border-l border-[#54C392]/40 pl-1.5 font-mono">
                {latencyMs}ms
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => checkHealth()}
            title="Backend server is offline! Click to retry connection."
            className="flex items-center space-x-2 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 px-3.5 py-1.5 rounded-xl border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all cursor-pointer animate-pulse"
          >
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold">Backend Offline</span>
            <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-mono">
              Retry
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
