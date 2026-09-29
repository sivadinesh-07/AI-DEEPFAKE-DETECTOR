import React from 'react';
import { HardDrive, CheckCircle2, Sliders, Info, Activity, RefreshCw, WifiOff } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';

export const Settings: React.FC = () => {
  const { isOnline, isChecking, latencyMs, lastChecked, checkHealth } = useBackendStatus();
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b2922] tracking-tight font-sans">System & Model Configuration</h1>
        <p className="text-xs text-[#205347] mt-0.5">Forensic thresholds, neural parameters, and hardware diagnostic metadata</p>
      </div>

      {/* Real-time Backend Connection Diagnostic */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest flex items-center space-x-2 font-mono">
            <Activity className="w-4 h-4 text-[#15B392]" />
            <span>FastAPI Backend Connection Diagnostic</span>
          </h2>
          <button
            onClick={() => checkHealth()}
            disabled={isChecking}
            className="px-3.5 py-2 bg-white hover:bg-[#eef8f3] disabled:opacity-50 text-[#0b2922] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-[#54C392]/35 hover:border-[#15B392] cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#15B392]' : 'text-[#15B392]'}`} />
            <span>{isChecking ? 'Pinging...' : 'Ping Backend Now'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl">
            <p className="text-[#205347] text-[11px] mb-1 font-mono">Server Endpoint</p>
            <p className="font-mono font-semibold text-[#0b2922] truncate">http://127.0.0.1:8000/api/v1</p>
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl">
            <p className="text-[#205347] text-[11px] mb-1 font-mono">Health Status</p>
            {isOnline ? (
              <div className="flex items-center space-x-2 text-[#15B392] font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-[#15B392] animate-pulse"></span>
                <span>Online {latencyMs !== null ? `(${latencyMs}ms)` : ''}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-rose-600 font-semibold font-mono">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline / Disconnected</span>
              </div>
            )}
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl">
            <p className="text-[#205347] text-[11px] mb-1 font-mono">Last Heartbeat</p>
            <p className="font-mono text-[#0b2922] font-semibold">
              {lastChecked ? lastChecked.toLocaleTimeString() : 'Checking...'}
            </p>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start space-x-3">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Backend Offline Warning</p>
              <p className="text-rose-800/90 mt-0.5">
                The Python server is not responding on port 8000. Start it from your terminal:
                <code className="block mt-1 font-mono text-[11px] text-rose-900 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 select-all">
                  python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
                </code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Model Checkpoints */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25 space-y-4">
        <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest flex items-center space-x-2 font-mono">
          <HardDrive className="w-4 h-4 text-[#15B392]" />
          <span>Active Checkpoints & Model Weights</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Spatial-Spectral Backbone</p>
              <p className="text-[11px] text-[#205347]/80 font-mono">checkpoints/spatial_best.pt</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#15B392]" />
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Temporal Bi-LSTM</p>
              <p className="text-[11px] text-[#205347]/80 font-mono">checkpoints/lstm_best.pt</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#15B392]" />
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Audio-Visual Lip-Sync Net</p>
              <p className="text-[11px] text-[#205347]/80 font-mono">checkpoints/av_sync_best.pt</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#15B392]" />
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Gated Multimodal Fusion</p>
              <p className="text-[11px] text-[#205347]/80 font-mono">checkpoints/fusion_best.pt</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#15B392]" />
          </div>
        </div>
      </div>

      {/* Forensic Thresholds */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25 space-y-4">
        <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest flex items-center space-x-2 font-mono">
          <Sliders className="w-4 h-4 text-[#15B392]" />
          <span>Documented Threshold Specifications</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Lip-Sync Consistent Threshold</p>
              <p className="text-[11px] text-[#205347]">Cosine correlation &ge; 0.65 indicates authentic viseme-phoneme speech</p>
            </div>
            <span className="font-mono font-bold text-[#15B392] text-sm">0.65</span>
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Lip-Sync Mild Mismatch Threshold</p>
              <p className="text-[11px] text-[#205347]">0.40 &le; Score &lt; 0.65 indicates minor temporal lag or synthesis blur</p>
            </div>
            <span className="font-mono font-bold text-amber-600 text-sm">0.40</span>
          </div>

          <div className="glass-card border border-[#54C392]/25 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0b2922]">Eye Aspect Ratio (EAR) Closure</p>
              <p className="text-[11px] text-[#205347]">EAR &lt; 0.20 triggers eye-blink closure event</p>
            </div>
            <span className="font-mono font-bold text-[#15B392] text-sm">0.20</span>
          </div>
        </div>
      </div>

      {/* Environment Diagnostics */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25 space-y-3 text-xs">
        <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest flex items-center space-x-2 font-mono">
          <Info className="w-4 h-4 text-[#15B392]" />
          <span>Execution Environment</span>
        </h2>
        <div className="space-y-2 text-[#205347] leading-relaxed font-mono text-[11px]">
          <p>• <strong className="text-[#0b2922]">Deep Learning Framework:</strong> PyTorch 2.13.0 with Torchvision &amp; Torchaudio</p>
          <p>• <strong className="text-[#0b2922]">Facial Landmark Engine:</strong> Google MediaPipe Tasks FaceLandmarker (XNNPACK CPU)</p>
          <p>• <strong className="text-[#0b2922]">Audio Embedding Backbone:</strong> HuggingFace Transformers Wav2Vec 2.0 (960h Base)</p>
          <p>• <strong className="text-[#0b2922]">Explainability Module:</strong> Grad-CAM on EfficientNet-B4 final convolutional stage</p>
          <p>• <strong className="text-[#0b2922]">Dataset Corpus:</strong> FakeAVCeleb v1.2 (21,500 videos) &amp; UADFV (98 videos)</p>
        </div>
      </div>
    </div>
  );
};
