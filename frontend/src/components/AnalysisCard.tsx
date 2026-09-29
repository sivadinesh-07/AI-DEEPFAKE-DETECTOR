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
      title: 'Spatial Analysis',
      desc: 'EfficientNet-B4 + 2D FFT Spectral Profile',
      score: result.spatial.score,
      icon: Eye,
      status: result.spatial.score > 0.5 ? 'Anomalous' : 'Nominal',
      color: result.spatial.score > 0.5 ? 'text-rose-600' : 'text-[#15B392]',
      bgColor: result.spatial.score > 0.5 ? 'bg-rose-500' : 'bg-[#15B392]',
    },
    {
      title: 'Temporal Analysis',
      desc: 'Bi-LSTM Inter-Frame Consistency',
      score: result.temporal.score,
      icon: Film,
      status: result.temporal.score > 0.5 ? 'Anomalous' : 'Nominal',
      color: result.temporal.score > 0.5 ? 'text-rose-600' : 'text-[#15B392]',
      bgColor: result.temporal.score > 0.5 ? 'bg-rose-500' : 'bg-[#15B392]',
    },
    {
      title: 'Audio Branch',
      desc: 'Wav2Vec 2.0 Acoustic Embedding',
      score: result.audio.score,
      icon: Mic,
      status: result.audio.score > 0.5 ? 'Anomalous' : 'Nominal',
      color: result.audio.score > 0.5 ? 'text-rose-600' : 'text-[#15B392]',
      bgColor: result.audio.score > 0.5 ? 'bg-rose-500' : 'bg-[#15B392]',
    },
    {
      title: 'Lip-Sync Alignment',
      desc: `Status: ${result.sync.status.replace('_', ' ')}`,
      score: result.sync.score,
      icon: Sparkles,
      status: result.sync.status === 'consistent' ? 'In-Sync' : 'Mismatch',
      color: result.sync.status === 'consistent' ? 'text-[#15B392]' : 'text-rose-600',
      bgColor: result.sync.status === 'consistent' ? 'bg-[#15B392]' : 'bg-rose-500',
    },
    {
      title: 'Facial Biometrics',
      desc: `EAR: ${result.facial_behavior.mean_ear.toFixed(2)} | MAR: ${result.facial_behavior.mean_mar.toFixed(2)}`,
      score: (result.facial_behavior.blink + result.facial_behavior.gaze + result.facial_behavior.lip) / 3,
      icon: Smile,
      status: '468 Mesh Evaluated',
      color: 'text-[#15B392]',
      bgColor: 'bg-[#15B392]',
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
              className="glass-card rounded-2xl p-4 flex flex-col justify-between border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-white/90 text-[#15B392] border border-[#54C392]/30 shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0b2922] font-sans">{m.title}</h3>
                  </div>
                  <span className={`text-[11px] font-bold font-mono ${m.color}`}>{m.status}</span>
                </div>
                <p className="text-[11px] text-[#205347] leading-relaxed font-mono">{m.desc}</p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                  <span className="text-[#205347]/70 font-medium">Anomaly Index</span>
                  <span className="font-bold text-[#0b2922]">{pct}%</span>
                </div>
                <div className="w-full bg-[#e3f2ea] rounded-full h-2 overflow-hidden border border-[#54C392]/25 shadow-inner">
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

      {/* Radar Chart */}
      <div className="glass-panel rounded-3xl p-5 border border-[#54C392]/25 flex flex-col items-center justify-center shadow-xs">
        <h3 className="text-xs font-bold text-[#0b2922] mb-1 uppercase tracking-widest self-start px-2 font-mono flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15B392] animate-pulse"></span>
          <span>Anomaly Distribution</span>
        </h3>
        <p className="text-[11px] text-[#205347] self-start px-2 mb-2 font-mono">Multi-axis anomaly signature</p>
        
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#cde8dc" />
              <PolarAngleAxis dataKey="subject" stroke="#54C392" tick={{ fill: '#205347', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }} />
              <Radar
                name="Anomaly"
                dataKey="score"
                stroke="#15B392"
                fill="#73EC8B"
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(84, 195, 146, 0.4)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#0b2922',
                  boxShadow: '0 10px 25px -5px rgba(21, 179, 146, 0.15)',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
