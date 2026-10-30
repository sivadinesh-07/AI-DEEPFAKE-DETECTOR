import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Film, Eye, X, ZoomIn, Clock } from 'lucide-react';
import type { FrameItem } from '../types/analysis';

interface FrameGalleryProps {
  frames: FrameItem[];
  suspiciousFrames: FrameItem[];
  onSeek?: (timestamp: number) => void;
}

export const FrameGallery: React.FC<FrameGalleryProps> = ({ frames, suspiciousFrames, onSeek }) => {
  const [activeTab, setActiveTab] = useState<'suspicious' | 'all'>('suspicious');
  const [selectedFrame, setSelectedFrame] = useState<FrameItem | null>(null);

  const displayList = activeTab === 'suspicious' ? suspiciousFrames : frames;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-rose-500/20 to-red-900/30 p-2.5 rounded-xl text-rose-400 border border-rose-500/30 shadow-inner">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight font-heading">
              Suspicious Frame Localization Filmstrip
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Frame-level temporal inconsistency, spectral artifacts and facial biometric diagnostics
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'suspicious'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Suspicious ({suspiciousFrames.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>All Frames ({frames.length})</span>
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      {displayList.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-white">No Suspicious Keyframes Flagged</p>
          <p className="text-slate-400 mt-0.5">All sampled frames demonstrate consistent spatial and spectral parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayList.map((f) => {
            const isAnom = f.is_suspicious || f.anomaly_score >= 0.50;
            const pct = Math.round(f.anomaly_score * 100);

            return (
              <div
                key={f.frame}
                onClick={() => setSelectedFrame(f)}
                className={`group bg-slate-900/80 rounded-2xl overflow-hidden border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                  isAnom
                    ? 'border-rose-500/40 hover:border-rose-500/80 shadow-rose-950/20'
                    : 'border-slate-800 hover:border-cyan-500/60 shadow-black/40'
                }`}
              >
                {/* Image Thumbnail */}
                <div className="aspect-square relative overflow-hidden bg-black">
                  <img
                    src={f.frame_url}
                    alt={`Frame ${f.frame}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-200 font-mono border border-slate-800 shadow-md">
                    #{f.frame}
                  </div>
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-extrabold border backdrop-blur-md font-mono ${
                    isAnom
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {isAnom ? 'SUSPICIOUS' : 'NOMINAL'}
                  </div>

                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-full text-cyan-400 border border-cyan-500/40 shadow-xl">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="font-mono">{f.timestamp.toFixed(2)}s</span>
                    </span>
                    <span className={`font-bold font-mono ${isAnom ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {pct}% Anomaly
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${isAnom ? 'bg-rose-500' : 'bg-cyan-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Biometrics */}
                  <div className="pt-0.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>EAR: {f.ear !== undefined ? f.ear.toFixed(2) : '—'}</span>
                    <span>MAR: {f.mar !== undefined ? f.mar.toFixed(2) : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Frame Diagnostic Modal */}
      {selectedFrame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setSelectedFrame(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono ${
                  selectedFrame.is_suspicious || selectedFrame.anomaly_score >= 0.5
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {selectedFrame.status.toUpperCase()}
                </span>
                <h3 className="text-lg font-bold text-white font-heading">
                  Frame #{selectedFrame.frame} Diagnostic Inspection
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Timestamp: {selectedFrame.timestamp.toFixed(2)}s • Anomaly Score: {Math.round(selectedFrame.anomaly_score * 100)}%
              </p>
            </div>

            {/* Side-by-side Aligned Face vs Grad-CAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">Aligned Canonical Facial Crop (224x224)</p>
                <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
                  <img
                    src={selectedFrame.frame_url}
                    alt={`Frame ${selectedFrame.frame}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">Grad-CAM Saliency &amp; Residual Map</p>
                <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner flex items-center justify-center">
                  {selectedFrame.heatmap_url ? (
                    <img
                      src={selectedFrame.heatmap_url}
                      alt={`Heatmap ${selectedFrame.frame}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-slate-500">
                      <Eye className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                      <span>Heatmap generated for top anomalous keyframes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Forensic Metric Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-4 text-xs text-center font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">Eye Aspect Ratio (EAR)</span>
                <strong className="text-white text-sm font-mono">
                  {selectedFrame.ear !== undefined ? selectedFrame.ear.toFixed(3) : '—'}
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {selectedFrame.ear && selectedFrame.ear < 0.20 ? 'Blink Event' : 'Open'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Mouth Aspect Ratio (MAR)</span>
                <strong className="text-white text-sm font-mono">
                  {selectedFrame.mar !== undefined ? selectedFrame.mar.toFixed(3) : '—'}
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">Viseme Articulation</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Temporal Phase Score</span>
                <strong className={`text-sm font-mono ${
                  selectedFrame.anomaly_score >= 0.5 ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {(selectedFrame.anomaly_score * 100).toFixed(1)}%
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">Bi-LSTM Residual</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              {onSeek && (
                <button
                  onClick={() => {
                    onSeek(selectedFrame.timestamp);
                    setSelectedFrame(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Seek Video to {selectedFrame.timestamp.toFixed(2)}s</span>
                </button>
              )}
              <button
                onClick={() => setSelectedFrame(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
