import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, FileBadge, Download, Hash } from 'lucide-react';
import type { AnalysisResult } from '../types/analysis';
import { api } from '../services/api';

interface PredictionCardProps {
  result: AnalysisResult;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ result }) => {
  const isFake = result.prediction === 'FAKE';
  const confidencePercent = (result.confidence * 100).toFixed(1);

  return (
    <div className={`glass-panel rounded-3xl p-7 shadow-sm relative overflow-hidden border ${
      isFake ? 'border-rose-500/30 shadow-rose-950/5' : 'border-[#54C392]/35 shadow-[#15B392]/5'
    }`}>
      {/* Ambient Verdict Glow */}
      <div className={`absolute -top-12 -right-12 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
        isFake ? 'bg-rose-500/15' : 'bg-[#73EC8B]/20'
      }`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#205347] mb-2 font-mono">
            <Hash className="w-3.5 h-3.5 text-[#15B392]" />
            <span>Audit ID: <strong className="text-[#0b2922]">{result.analysis_id}</strong></span>
            <span className="text-[#54C392]/40">•</span>
            <Clock className="w-3.5 h-3.5 text-[#205347]/70" />
            <span>Duration: <strong className="text-[#0b2922]">{result.processing_time}s</strong></span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0b2922] tracking-tight font-sans">{result.filename}</h2>
          <p className="text-xs text-[#205347]/80 mt-1 font-mono">
            {result.metadata.resolution} • {result.metadata.fps} FPS • {result.metadata.duration}s duration
          </p>
        </div>

        {/* Verdict Badge & Score */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#205347]/70 font-bold font-mono">Confidence</p>
            <p className="text-3xl font-black text-[#0b2922] font-mono">{confidencePercent}%</p>
          </div>

          <div className={`px-6 py-3.5 rounded-2xl border flex items-center space-x-3.5 shadow-sm ${
            isFake
              ? 'bg-gradient-to-br from-rose-500/15 to-red-600/10 border-rose-500/40 text-rose-600 shadow-xs'
              : 'bg-gradient-to-br from-[#73EC8B]/35 to-[#54C392]/20 border-[#54C392]/50 text-[#0c4739] shadow-xs'
          }`}>
            {isFake ? <ShieldAlert className="w-9 h-9 shrink-0 text-rose-500 animate-pulse-subtle" /> : <ShieldCheck className="w-9 h-9 shrink-0 text-[#15B392]" />}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono font-semibold opacity-85">Detection Verdict</p>
              <p className="text-2xl font-black tracking-tight font-mono">{result.prediction}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#54C392]/25 flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-2 text-xs text-[#205347]">
          <FileBadge className="w-4 h-4 text-[#15B392]" />
          <span>Multimodal Cross-Verified Forensic Decision</span>
        </div>
        <a
          href={api.getReportUrl(result.analysis_id)}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] hover:from-[#0fa082] hover:to-[#43aa7d] text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-[#15B392]/20 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-white" />
          <span>Download Audit Dossier (PDF)</span>
        </a>
      </div>
    </div>
  );
};
