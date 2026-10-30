import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { Eye, Mic, Film, Sparkles, Smile } from 'lucide-react';
import type { AnalysisResult } from '../types/analysis';

interface AnalysisCardProps {
  result: AnalysisResult;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ result }) => {
  const radarData = [
    { subject: 'Spatial', score: Math.round(result.spatial.score * 100) },
    { subject: 'Temporal', score: Math.round(result.temporal.score * 100) },
    { subject: 'Audio', score: Math.round(result.audio.score * 100) },
    { subject: 'Lip-Sync', score: Math.round((1.0 - result.sync.score) * 100) }, // higher mismatch = higher anomaly
    { subject: 'Behavior', score: Math.round(((result.facial_behavior.blink + result.facial_behavior.gaze + result.facial_behavior.lip) / 3) * 100) },
  ];

  const metrics = [
    {
      title: 'Spatial Texture',
      desc: 'EfficientNet-B4 + 2D FFT Azimuthal Spectrum',
      score: result.spatial.score,
      icon: Eye,
      status: result.spatial.score > 0.5 ? 'Anomalous' : 'Pristine',
      color: result.spatial.score > 0.5 ? 'text-rose-400' : 'text-cyan-400',
      bgColor: result.spatial.score > 0.5 ? 'bg-rose-500' : 'bg-cyan-400',
    },
    {
      title: 'Temporal Dynamics',
      desc: 'Bi-LSTM Inter-Frame Consistency & Jitter',
      score: result.temporal.score,
      icon: Film,
      status: result.temporal.score > 0.5 ? 'Anomalous' : 'Continuous',
      color: result.temporal.score > 0.5 ? 'text-rose-400' : 'text-cyan-400',
      bgColor: result.temporal.score > 0.5 ? 'bg-rose-500' : 'bg-cyan-400',
    },
    {
      title: 'Acoustic Phonetics',
      desc: 'Wav2Vec 2.0 Speech Phoneme Representation',
      score: result.audio.score,
      icon: Mic,
      status: result.audio.score > 0.5 ? 'Anomalous' : 'Authentic',
      color: result.audio.score > 0.5 ? 'text-rose-400' : 'text-cyan-400',
      bgColor: result.audio.score > 0.5 ? 'bg-rose-500' : 'bg-cyan-400',
    },
    {
      title: 'Lip-Sync Alignment',
      desc: `Cross-modal status: ${result.sync.status.replace('_', ' ')}`,
      score: result.sync.score,
      icon: Sparkles,
      status: result.sync.status === 'consistent' ? 'In-Sync' : 'Mismatch Flagged',
      color: result.sync.status === 'consistent' ? 'text-emerald-400' : 'text-rose-400',
      bgColor: result.sync.status === 'consistent' ? 'bg-emerald-400' : 'bg-rose-500',
    },
    {
      title: 'Facial Mesh Biometrics',
      desc: `EAR: ${result.facial_behavior.mean_ear.toFixed(2)} | MAR: ${result.facial_behavior.mean_mar.toFixed(2)}`,
      score: (result.facial_behavior.blink + result.facial_behavior.gaze + result.facial_behavior.lip) / 3,
      icon: Smile,
      status: '468 Mesh Audited',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Metric Cards */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          const pct = Math.round(m.score * 100);

          return (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shadow-inner">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white font-heading">{m.title}</h3>
                  </div>
                  <span className={`text-[11px] font-bold font-mono ${m.color}`}>{m.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">{m.desc}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                  <span className="text-slate-400 text-[10px] uppercase">Anomaly Index</span>
                  <span className="font-bold text-slate-200">{pct}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 shadow-inner">
                  <div
                    className={`${m.bgColor} h-full rounded-full transition-all duration-500 shadow-xs`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cyber Radar Chart */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="self-start px-1 mb-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Multimodal Anomaly Signature</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">5-axis anomaly distribution</p>
        </div>
        
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis
                dataKey="subject"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Radar
                name="Anomaly %"
                dataKey="score"
                stroke="#00F0FF"
                fill="#00F0FF"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0e1424',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.8)',
                  fontFamily: 'JetBrains Mono',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
