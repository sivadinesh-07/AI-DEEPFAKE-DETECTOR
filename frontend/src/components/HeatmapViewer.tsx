import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sliders, Layers, Eye } from 'lucide-react';
import type { HeatmapItem } from '../types/analysis';

interface HeatmapViewerProps {
  heatmaps: HeatmapItem[];
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ heatmaps }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.65);

  if (!heatmaps || heatmaps.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
        <Eye className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p>No anomalous frames detected for Grad-CAM generation.</p>
      </div>
    );
  }

  const current = heatmaps[currentIndex] || heatmaps[0];

  return (
    <div className="glass-panel rounded-3xl p-7 border border-[#54C392]/25 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#0b2922] flex items-center space-x-2 font-sans">
            <Layers className="w-4 h-4 text-[#15B392]" />
            <span>Grad-CAM Explainability & Spatial Saliency</span>
          </h3>
          <p className="text-xs text-[#205347] mt-0.5">
            Activation maps from EfficientNet-B4 features.8 highlighting manipulation boundaries
          </p>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center space-x-3 bg-white/90 px-4 py-2 rounded-xl border border-[#54C392]/30 font-mono text-xs">
          <Sliders className="w-3.5 h-3.5 text-[#15B392]" />
          <span className="text-[#205347]">Opacity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-24 accent-[#15B392] cursor-pointer"
          />
          <span className="font-bold text-[#0b2922] w-8">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Main Heatmap Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Heatmap Image Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-[#54C392]/35 bg-[#f4faf6] aspect-square max-w-sm mx-auto shadow-md">
          <img
            src={current.image_url}
            alt={`Grad-CAM frame ${current.frame}`}
            className="w-full h-full object-cover transition-opacity duration-200"
            style={{ opacity: opacity }}
          />
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl border border-[#54C392]/40 text-[11px] text-[#205347] font-mono shadow-xs">
            Frame: <strong className="text-[#0b2922]">{current.frame}</strong>
          </div>
          <div className="absolute top-3 right-3 bg-rose-500/15 backdrop-blur-md px-3 py-1 rounded-xl border border-rose-500/30 text-[11px] text-rose-600 font-bold font-mono shadow-xs">
            Anomaly: {Math.round(current.anomaly_score * 100)}%
          </div>
        </div>

        {/* Frame Context & Controls */}
        <div className="space-y-4">
          <div className="glass-card border border-[#54C392]/25 rounded-2xl p-5 space-y-2.5 text-xs">
            <p className="text-[#205347]">
              <strong className="text-[#0b2922] font-mono">Temporal Timestamp:</strong> {current.timestamp.toFixed(2)} seconds
            </p>
            <p className="text-[#205347]">
              <strong className="text-[#0b2922]">Localization Zone:</strong> Highlighted regions (red/yellow) indicate spatial frequency discontinuities and blending artifacts around facial boundaries and mouth contours.
            </p>
            <p className="text-[#205347]">
              <strong className="text-[#0b2922]">Spectral Consistency:</strong> High-frequency Fourier azimuthal residual confirms synthetic generator artifacts.
            </p>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : heatmaps.length - 1))}
              className="px-4 py-2 bg-white hover:bg-[#eef8f3] text-[#0b2922] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-[#54C392]/30 hover:border-[#15B392]/60 cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-[#15B392]" />
              <span>Previous Frame</span>
            </button>
            <span className="text-xs text-[#205347] font-mono">
              {currentIndex + 1} of {heatmaps.length} suspicious frames
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev < heatmaps.length - 1 ? prev + 1 : 0))}
              className="px-4 py-2 bg-white hover:bg-[#eef8f3] text-[#0b2922] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-[#54C392]/30 hover:border-[#15B392]/60 cursor-pointer shadow-xs"
            >
              <span>Next Frame</span>
              <ChevronRight className="w-4 h-4 text-[#15B392]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
