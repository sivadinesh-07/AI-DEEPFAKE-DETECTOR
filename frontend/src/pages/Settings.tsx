import React from 'react';
import { HardDrive, CheckCircle2, Sliders, Info, Activity, RefreshCw, WifiOff, CloudOff } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';
import { getEndpointDisplayUrl, isRemoteBackendConfigured } from '../services/api';

export const Settings: React.FC = () => {
  const { isOnline, isChecking, latencyMs, lastChecked, checkHealth } = useBackendStatus();
  const isRemote = isRemoteBackendConfigured();

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight font-heading">
          System Diagnostics &amp; Model Checkpoints
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Neural network checkpoint states, decision threshold configurations &amp; runtime telemetry
        </p>
      </div>

      {/* Real-time Backend Connection Diagnostic */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 font-mono">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>FastAPI Backend Telemetry &amp; Handshake</span>
          </h2>
          <button
            onClick={() => checkHealth()}
            disabled={isChecking}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-800 hover:border-cyan-500/50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
            <span>{isChecking ? 'Pinging Server...' : 'Ping Inference Server'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="glass-card border border-slate-800 p-4 rounded-2xl">
            <p className="text-slate-400 text-[11px] mb-1 font-mono uppercase">Inference URI</p>
            <p className="font-mono font-semibold text-cyan-400 truncate" title={getEndpointDisplayUrl()}>
              {getEndpointDisplayUrl()}
            </p>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl">
            <p className="text-slate-400 text-[11px] mb-1 font-mono uppercase">Status</p>
            {isOnline ? (
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Operational {latencyMs !== null ? `(${latencyMs}ms)` : ''}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-rose-400 font-semibold font-mono">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline / Unreachable</span>
              </div>
            )}
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl">
            <p className="text-slate-400 text-[11px] mb-1 font-mono uppercase">Last Ping</p>
            <p className="font-mono text-slate-200 font-semibold">
              {lastChecked ? lastChecked.toLocaleTimeString() : 'Awaiting check...'}
            </p>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 flex items-start space-x-3">
            {isRemote ? <CloudOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> : <WifiOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold text-white">Backend Offline Warning</p>
              {isRemote ? (
                <p className="text-rose-300 mt-0.5">
                  The configured cloud inference server at <code className="text-cyan-300 font-mono">{getEndpointDisplayUrl()}</code> is not responding. Ensure your deployed backend service is running and active.
                </p>
              ) : (
                <p className="text-rose-300 mt-0.5">
                  The Python server is not responding on port 8000. Launch it from your terminal:
                  <code className="block mt-1.5 font-mono text-[11px] text-cyan-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 select-all">
                    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
                  </code>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model Checkpoints */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 font-mono">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Active Checkpoints &amp; Neural Weights</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Spatial-Spectral Backbone</p>
              <p className="text-[11px] text-slate-400 font-mono">checkpoints/spatial_best.pt</p>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Loaded</span>
            </div>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Temporal Bi-LSTM</p>
              <p className="text-[11px] text-slate-400 font-mono">checkpoints/lstm_best.pt</p>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Loaded</span>
            </div>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Audio-Visual Lip-Sync Net</p>
              <p className="text-[11px] text-slate-400 font-mono">checkpoints/av_sync_best.pt</p>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Loaded</span>
            </div>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Gated Multimodal Fusion</p>
              <p className="text-[11px] text-slate-400 font-mono">checkpoints/fusion_best.pt</p>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Loaded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Thresholds */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 font-mono">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Decision Threshold Specifications</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Lip-Sync Consistent Threshold</p>
              <p className="text-[11px] text-slate-400">Cosine correlation &ge; 0.65 indicates authentic viseme-phoneme speech synchronization</p>
            </div>
            <span className="font-mono font-bold text-emerald-400 text-sm bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              0.65
            </span>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Lip-Sync Mild Mismatch Threshold</p>
              <p className="text-[11px] text-slate-400">0.40 &le; Score &lt; 0.65 flags minor audio-video lag or synthetic blur</p>
            </div>
            <span className="font-mono font-bold text-amber-400 text-sm bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              0.40
            </span>
          </div>

          <div className="glass-card border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Eye Aspect Ratio (EAR) Closure Threshold</p>
              <p className="text-[11px] text-slate-400">EAR &lt; 0.20 triggers biological blink event</p>
            </div>
            <span className="font-mono font-bold text-cyan-400 text-sm bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              0.20
            </span>
          </div>
        </div>
      </div>

      {/* Execution Environment */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-3 text-xs">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 font-mono">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Execution Environment &amp; Frameworks</span>
        </h2>
        <div className="space-y-2 text-slate-400 leading-relaxed font-mono text-[11px]">
          <p>• <strong className="text-slate-200">Deep Learning Framework:</strong> PyTorch 2.13.0 with Torchvision &amp; Torchaudio</p>
          <p>• <strong className="text-slate-200">Facial Landmark Engine:</strong> Google MediaPipe Tasks FaceLandmarker (XNNPACK CPU)</p>
          <p>• <strong className="text-slate-200">Audio Embedding Backbone:</strong> HuggingFace Transformers Wav2Vec 2.0 (960h Base)</p>
          <p>• <strong className="text-slate-200">Explainability Module:</strong> Grad-CAM on EfficientNet-B4 final convolutional stage</p>
          <p>• <strong className="text-slate-200">Dataset Corpus:</strong> FakeAVCeleb v1.2 (21,500 videos) &amp; UADFV (98 videos)</p>
        </div>
      </div>
    </div>
  );
};
