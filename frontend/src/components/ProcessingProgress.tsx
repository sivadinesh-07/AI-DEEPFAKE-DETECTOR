import React from 'react';
import { Loader2, CheckCircle2, CircleDashed } from 'lucide-react';

interface ProcessingProgressProps {
  stage: string;
  progress: number;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ stage, progress }) => {
  const STAGES = [
    { key: 'extracting_frames', label: 'Extracting Video Keyframes' },
    { key: 'detecting_faces', label: 'Face Detection & 5-Pt Canonical Alignment' },
    { key: 'extracting_landmarks', label: 'MediaPipe 468 Landmark Mesh (EAR, MAR, Gaze)' },
    { key: 'spatial_analysis', label: 'EfficientNet-B4 Spatial & 2D-FFT Spectral Extraction' },
    { key: 'temporal_analysis', label: 'Bi-LSTM Inter-Frame Temporal Continuity' },
    { key: 'audio_analysis', label: '16kHz Audio & Wav2Vec 2.0 Speech Embeddings' },
    { key: 'lip_sync_analysis', label: 'Audio-Visual Lip-Sync Cross-Modal Correlation' },
    { key: 'multimodal_fusion', label: 'Gated Multimodal Fusion & Decision Network' },
    { key: 'explainability_gradcam', label: 'Grad-CAM Explainability & Forensic Profiling' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="glass-panel-glow rounded-3xl p-7 sm:p-9 shadow-2xl border border-cyan-500/25 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2.5 font-heading">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span>Forensic Neural Pipeline In Progress</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronous multimodal inference running across deep learning branches
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-cyan-400 font-mono">{progress}%</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
            Pipeline Execution
          </p>
        </div>
      </div>

      {/* Modern Gradient Progress Bar */}
      <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 shadow-inner relative">
        <div
          className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 h-full transition-all duration-300 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Compute Stages Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
        {STAGES.map((s, idx) => {
          const isDone = currentStageIndex > idx || progress === 100;
          const isCurrent = currentStageIndex === idx && progress < 100;

          return (
            <div
              key={s.key}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs transition-all border ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : isCurrent
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-bold shadow-[0_0_20px_rgba(0,240,255,0.1)]'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              ) : (
                <CircleDashed className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
