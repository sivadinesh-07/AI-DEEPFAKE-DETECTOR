import React from 'react';
import { Loader2, CheckCircle2, CircleDashed } from 'lucide-react';

interface ProcessingProgressProps {
  stage: string;
  progress: number;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ stage, progress }) => {
  const STAGES = [
    { key: 'extracting_frames', label: 'Extracting Video Frames' },
    { key: 'detecting_faces', label: 'Face Detection & 5-Pt Alignment' },
    { key: 'extracting_landmarks', label: 'MediaPipe 468 Landmark Mesh (EAR, MAR, Gaze)' },
    { key: 'spatial_analysis', label: 'EfficientNet-B4 Spatial & 2D-FFT Spectral Extraction' },
    { key: 'temporal_analysis', label: 'Bi-LSTM Inter-Frame Temporal Consistency' },
    { key: 'audio_analysis', label: '16kHz Audio & Wav2Vec 2.0 Speech Embeddings' },
    { key: 'lip_sync_analysis', label: 'Audio-Visual Lip-Sync Cross-Modal Correlation' },
    { key: 'multimodal_fusion', label: 'Gated Multimodal Fusion & Decision Network' },
    { key: 'explainability_gradcam', label: 'Grad-CAM Explainability & Forensic Profiling' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="glass-panel rounded-3xl p-7 shadow-sm border border-[#54C392]/30 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0b2922] flex items-center space-x-2 font-sans">
            <Loader2 className="w-5 h-5 text-[#15B392] animate-spin" />
            <span>Forensic Pipeline In Progress</span>
          </h3>
          <p className="text-xs text-[#205347] mt-0.5">Live execution across neural architectures</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-[#15B392] font-mono">{progress}%</span>
          <p className="text-[11px] text-[#205347]/70 uppercase tracking-widest font-bold font-mono">Progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#e3f2ea] rounded-full h-2.5 overflow-hidden border border-[#54C392]/30 shadow-inner">
        <div
          className="bg-gradient-to-r from-[#15B392] via-[#54C392] to-[#73EC8B] h-full transition-all duration-300 rounded-full shadow-[0_0_15px_rgba(21,179,146,0.35)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stages Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
        {STAGES.map((s, idx) => {
          const isDone = currentStageIndex > idx || progress === 100;
          const isCurrent = currentStageIndex === idx && progress < 100;

          return (
            <div
              key={s.key}
              className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                isDone
                  ? 'bg-[#73EC8B]/20 border border-[#54C392]/35 text-[#0c4739]'
                  : isCurrent
                  ? 'bg-[#D2FF72]/40 border border-[#73EC8B]/60 text-[#0b2922] font-semibold shadow-xs'
                  : 'bg-white/60 border border-[#54C392]/20 text-[#205347]/50'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-[#15B392] shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-[#15B392] animate-spin shrink-0" />
              ) : (
                <CircleDashed className="w-4 h-4 text-[#54C392]/50 shrink-0" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
