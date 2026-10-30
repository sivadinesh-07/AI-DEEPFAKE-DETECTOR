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
    <div className={`glass-panel-glow rounded-3xl p-7 sm:p-8 shadow-2xl relative overflow-hidden border ${
      isFake ? 'border-rose-500/40 shadow-rose-950/20' : 'border-emerald-500/40 shadow-emerald-950/20'
    }`}>
      {/* Ambient Verdict Glow Halo */}
      <div className={`absolute -top-16 -right-16 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
        isFake ? 'bg-rose-500/15' : 'bg-emerald-500/15'
      }`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
            <span className="flex items-center space-x-1">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit ID: <strong className="text-slate-200">{result.analysis_id}</strong></span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Inference Time: <strong className="text-slate-200">{result.processing_time}s</strong></span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
            {result.filename}
          </h2>

          <p className="text-xs text-slate-300 mt-1.5 font-mono flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300">
              {result.metadata.resolution}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300">
              {result.metadata.fps} FPS
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300">
              {result.metadata.duration}s duration
            </span>
          </p>
        </div>

        {/* Verdict Badge & Score */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
              Detection Certainty
            </p>
            <p className="text-3xl sm:text-4xl font-black text-white font-mono">
              {confidencePercent}%
            </p>
          </div>

          <div className={`px-6 py-4 rounded-2xl border flex items-center space-x-4 shadow-xl ${
            isFake
              ? 'bg-gradient-to-br from-rose-500/20 to-red-900/30 border-rose-500/50 text-rose-300 shadow-rose-900/20'
              : 'bg-gradient-to-br from-emerald-500/20 to-teal-900/30 border-emerald-500/50 text-emerald-300 shadow-emerald-900/20'
          }`}>
            {isFake ? (
              <ShieldAlert className="w-10 h-10 shrink-0 text-rose-400 animate-pulse-subtle" />
            ) : (
              <ShieldCheck className="w-10 h-10 shrink-0 text-emerald-400" />
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono font-bold opacity-80">
                Decision Verdict
              </p>
              <p className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {result.prediction}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-2 text-xs text-slate-300">
          <FileBadge className="w-4 h-4 text-cyan-400" />
          <span>Multimodal Gated-Fusion Cross-Verified Forensic Decision</span>
        </div>

        <a
          href={api.getReportUrl(result.analysis_id)}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-950" />
          <span>Download PDF Forensic Dossier</span>
        </a>
      </div>
    </div>
  );
};
