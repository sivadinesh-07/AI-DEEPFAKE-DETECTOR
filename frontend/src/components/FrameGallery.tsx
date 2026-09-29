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
    <div className="glass-panel rounded-3xl p-7 border border-[#54C392]/25 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="bg-gradient-to-br from-rose-500/20 to-red-600/10 p-2.5 rounded-xl text-rose-500 border border-rose-500/30 shadow-xs">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0b2922] tracking-tight font-sans">Suspicious Frame Localization</h3>
              <p className="text-xs text-[#205347] mt-0.5">
                Frame-level temporal inconsistency and facial anomaly diagnostics
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white/90 p-1.5 rounded-xl border border-[#54C392]/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'suspicious'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-[#205347] hover:text-[#0b2922]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Suspicious ({suspiciousFrames.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] text-white shadow-xs'
                : 'text-[#205347] hover:text-[#0b2922]'
            }`}
          >
            <span>All Keyframes ({frames.length})</span>
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      {displayList.length === 0 ? (
        <div className="bg-white/60 border border-dashed border-[#54C392]/30 rounded-2xl p-8 text-center text-xs text-[#205347]">
          <CheckCircle2 className="w-8 h-8 text-[#15B392] mx-auto mb-2" />
          <p className="font-semibold text-[#0b2922]">No Suspicious Frames Detected</p>
          <p className="text-[#205347]/70 mt-0.5">All sampled frames fall below the manipulation threshold.</p>
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
                className={`group bg-white rounded-xl overflow-hidden border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-md ${
                  isAnom
                    ? 'border-rose-500/40 hover:border-rose-500/80'
                    : 'border-[#54C392]/25 hover:border-[#15B392]'
                }`}
              >
                {/* Image Thumbnail */}
                <div className="aspect-square relative overflow-hidden bg-black">
                  <img
                    src={f.frame_url}
                    alt={`Frame ${f.frame}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-[#0b2922] font-mono shadow-xs">
                    #{f.frame}
                  </div>
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold border backdrop-blur-md ${
                    isAnom
                      ? 'bg-rose-500/15 text-rose-600 border-rose-500/40'
                      : 'bg-[#73EC8B]/25 text-[#0c4739] border-[#54C392]/40'
                  }`}>
                    {isAnom ? 'SUSPICIOUS' : 'NOMINAL'}
                  </div>

                  <div className="absolute inset-0 bg-[#0b2922]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-md p-2 rounded-full text-[#15B392] border border-[#54C392]/40 shadow-sm">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[#205347]">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-[#205347]/70" />
                      <span>{f.timestamp.toFixed(2)}s</span>
                    </span>
                    <span className={`font-bold ${isAnom ? 'text-rose-600' : 'text-[#15B392]'}`}>
                      {pct}% Anomaly
                    </span>
                  </div>

                  {/* Micro Progress */}
                  <div className="w-full bg-[#e3f2ea] rounded-full h-1.5 overflow-hidden border border-[#54C392]/20">
                    <div
                      className={`h-full rounded-full ${isAnom ? 'bg-rose-500' : 'bg-[#15B392]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Biometrics */}
                  <div className="pt-1 flex items-center justify-between text-[10px] text-[#205347]/80 font-mono">
                    <span>EAR: {f.ear !== undefined ? f.ear.toFixed(2) : '—'}</span>
                    <span>MAR: {f.mar !== undefined ? f.mar.toFixed(2) : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Frame Inspection Modal */}
      {selectedFrame && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#54C392]/30 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setSelectedFrame(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#eef8f3] text-[#205347] hover:text-[#0b2922] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  selectedFrame.is_suspicious || selectedFrame.anomaly_score >= 0.5
                    ? 'bg-rose-500/15 text-rose-600 border-rose-500/40'
                    : 'bg-[#73EC8B]/25 text-[#0c4739] border-[#54C392]/40'
                }`}>
                  {selectedFrame.status.toUpperCase()}
                </span>
                <h3 className="text-lg font-bold text-[#0b2922]">
                  Frame #{selectedFrame.frame} Diagnostic Inspection
                </h3>
              </div>
              <p className="text-xs text-[#205347] mt-1">
                Timestamp: {selectedFrame.timestamp.toFixed(2)}s • Anomaly Score: {Math.round(selectedFrame.anomaly_score * 100)}%
              </p>
            </div>

            {/* Side-by-side: Aligned Face vs Grad-CAM Overlay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#0b2922]">Aligned Canonical Facial Crop (224x224)</p>
                <div className="aspect-square rounded-xl overflow-hidden border border-[#54C392]/30 bg-black shadow-inner">
                  <img
                    src={selectedFrame.frame_url}
                    alt={`Frame ${selectedFrame.frame}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#0b2922]">Grad-CAM Saliency &amp; Residual Map</p>
                <div className="aspect-square rounded-xl overflow-hidden border border-[#54C392]/30 bg-black shadow-inner flex items-center justify-center">
                  {selectedFrame.heatmap_url ? (
                    <img
                      src={selectedFrame.heatmap_url}
                      alt={`Heatmap ${selectedFrame.frame}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-[#205347]/60">
                      <Eye className="w-6 h-6 mx-auto mb-1 text-[#54C392]/60" />
                      <span>Heatmap only generated for top anomalous frames</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Forensic Detail Bar */}
            <div className="bg-[#f4faf6] border border-[#54C392]/25 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs text-center">
              <div>
                <span className="text-[#205347]/70 text-[11px] block">Eye Aspect Ratio (EAR)</span>
                <strong className="text-[#0b2922] text-sm font-mono">
                  {selectedFrame.ear !== undefined ? selectedFrame.ear.toFixed(3) : '—'}
                </strong>
                <span className="text-[10px] text-[#205347]/60 block mt-0.5">
                  {selectedFrame.ear && selectedFrame.ear < 0.20 ? 'Closure / Blink' : 'Open'}
                </span>
              </div>
              <div>
                <span className="text-[#205347]/70 text-[11px] block">Mouth Aspect Ratio (MAR)</span>
                <strong className="text-[#0b2922] text-sm font-mono">
                  {selectedFrame.mar !== undefined ? selectedFrame.mar.toFixed(3) : '—'}
                </strong>
                <span className="text-[10px] text-[#205347]/60 block mt-0.5">Viseme Articulation</span>
              </div>
              <div>
                <span className="text-[#205347]/70 text-[11px] block">Temporal Phase Score</span>
                <strong className={`text-sm font-mono ${
                  selectedFrame.anomaly_score >= 0.5 ? 'text-rose-600' : 'text-[#15B392]'
                }`}>
                  {(selectedFrame.anomaly_score * 100).toFixed(1)}%
                </strong>
                <span className="text-[10px] text-[#205347]/60 block mt-0.5">Bi-LSTM Residual</span>
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
                  className="px-4 py-2 bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Seek Video to {selectedFrame.timestamp.toFixed(2)}s</span>
                </button>
              )}
              <button
                onClick={() => setSelectedFrame(null)}
                className="px-4 py-2 bg-[#eef8f3] hover:bg-[#e0f1e7] text-[#205347] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
