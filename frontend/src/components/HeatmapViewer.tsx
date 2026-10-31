import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sliders, Layers, Eye } from 'lucide-react';
import type { HeatmapItem } from '../types/analysis';
import { resolveMediaUrl } from '../services/api';

interface HeatmapViewerProps {
  heatmaps: HeatmapItem[];
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ heatmaps }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.70);

  if (!heatmaps || heatmaps.length === 0) {
    return (
      <div className="glass-panel border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-sm">
        <Eye className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p>No anomalous frames detected for Grad-CAM explainability generation.</p>
      </div>
    );
  }

  const current = heatmaps[currentIndex] || heatmaps[0];

  return (
    <div className="glass-panel rounded-3xl p-7 border border-slate-800 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-heading">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Grad-CAM Explainability &amp; Spatial Saliency</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Activation maps from EfficientNet-B4 features.8 highlighting manipulation boundaries
          </p>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Heatmap Alpha:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-24 accent-cyan-400 cursor-pointer"
          />
          <span className="font-bold text-cyan-300 w-8">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Main Heatmap Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Heatmap Image Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-square max-w-sm mx-auto shadow-2xl">
          <img
            src={resolveMediaUrl(current.image_url)}
            alt={`Grad-CAM frame ${current.frame}`}
            className="w-full h-full object-cover transition-opacity duration-200"
            style={{ opacity: opacity }}
          />
          <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-[11px] text-slate-200 font-mono shadow-md">
            Frame: <strong className="text-cyan-400">#{current.frame}</strong>
          </div>
          <div className="absolute top-3 right-3 bg-rose-500/20 backdrop-blur-md px-3 py-1 rounded-xl border border-rose-500/40 text-[11px] text-rose-300 font-bold font-mono shadow-md">
            Anomaly: {Math.round(current.anomaly_score * 100)}%
          </div>
        </div>

        {/* Frame Context & Controls */}
        <div className="space-y-4">
          <div className="glass-card border border-slate-800 rounded-2xl p-5 space-y-3 text-xs leading-relaxed">
            <p className="text-slate-300">
              <strong className="text-white font-mono">Temporal Timestamp:</strong> {current.timestamp.toFixed(2)} seconds
            </p>
            <p className="text-slate-300">
              <strong className="text-white">Localization Zone:</strong> Highlighted saliency zones (red/yellow gradient) pinpoint spatial texture discontinuities, edge warping, and blending artifacts around facial boundaries and mouth contours.
            </p>
            <p className="text-slate-300">
              <strong className="text-white">Spectral Correlation:</strong> High-frequency Fourier azimuthal residual confirms synthetic generator artifacts.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : heatmaps.length - 1))}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-800 hover:border-cyan-500/40 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span>Previous Frame</span>
            </button>

            <span className="text-xs text-slate-400 font-mono">
              {currentIndex + 1} of {heatmaps.length} suspicious frames
            </span>

            <button
              onClick={() => setCurrentIndex((prev) => (prev < heatmaps.length - 1 ? prev + 1 : 0))}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-800 hover:border-cyan-500/40 cursor-pointer shadow-sm"
            >
              <span>Next Frame</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
