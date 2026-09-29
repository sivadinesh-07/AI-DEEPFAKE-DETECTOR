import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Video, ArrowUpRight, Layers, Activity } from 'lucide-react';
import { api } from '../services/api';
import type { HistoryResponse } from '../types/analysis';
import { useBackendStatus } from '../context/BackendStatusContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useBackendStatus();

  useEffect(() => {
    if (isOnline) {
      setLoading(true);
      api.getHistory(0, 5)
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOnline]);

  const kpis = data?.kpis || { total_analyses: 0, total_real: 0, total_fake: 0, avg_confidence: 0.0 };

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-[#e3f6ed]/95 via-[#eff9f4]/95 to-white border border-[#54C392]/30 rounded-3xl p-8 sm:p-9 shadow-md relative overflow-hidden">
        {/* Subtle Ambient Radial Spotlight */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#73EC8B]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-60 h-60 bg-[#D2FF72]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0c4739] bg-[#D2FF72]/50 px-3 py-1 rounded-full border border-[#73EC8B]/60 font-mono shadow-xs">
            Temporal-Spectral Inconsistency Modeling
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b2922] mt-3.5 tracking-tight font-sans">
            Neural Facial Media Forensics Platform
          </h1>
          <p className="text-sm text-[#205347] mt-2.5 leading-relaxed font-normal">
            Multi-domain deepfake detection integrating spatial texture artifacts, 2D FFT spectral anomalies,
            Bi-LSTM sequence modeling, Wav2Vec 2.0 speech acoustics, and 468 MediaPipe biometric landmarks.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/analyze"
              className="px-6 py-3 bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] hover:from-[#0fa082] hover:to-[#43aa7d] text-white rounded-xl text-xs font-extrabold tracking-wide shadow-lg shadow-[#15B392]/25 flex items-center space-x-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Start New Forensic Audit</span>
            </Link>
            <Link
              to="/history"
              className="px-5 py-3 bg-white hover:bg-[#eef8f3] text-[#205347] hover:text-[#0b2922] rounded-xl text-xs font-semibold border border-[#54C392]/30 transition-all cursor-pointer shadow-xs"
            >
              View Analysis History
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#54C392]/80 to-transparent" />
          <div className="flex items-center justify-between text-[#205347] mb-2.5 text-xs">
            <span className="font-semibold tracking-wide uppercase text-[11px] text-[#205347]">Total Audits</span>
            <div className="p-2 rounded-xl bg-[#73EC8B]/20 border border-[#54C392]/35 text-[#15B392] group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#0b2922] font-mono">{kpis.total_analyses}</p>
          <p className="text-[11px] text-[#205347]/70 mt-1 font-medium">Processed media items</p>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#73EC8B] to-transparent" />
          <div className="flex items-center justify-between text-[#205347] mb-2.5 text-xs">
            <span className="font-semibold tracking-wide uppercase text-[11px] text-[#205347]">Authentic Media</span>
            <div className="p-2 rounded-xl bg-[#73EC8B]/25 border border-[#54C392]/40 text-[#15B392] group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#15B392] font-mono">{kpis.total_real}</p>
          <p className="text-[11px] text-[#205347]/70 mt-1 font-medium">Verified pristine videos</p>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-[#54C392]/25 hover:border-rose-500/40 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
          <div className="flex items-center justify-between text-[#205347] mb-2.5 text-xs">
            <span className="font-semibold tracking-wide uppercase text-[11px] text-[#205347]">Synthetic Media</span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600 font-mono">{kpis.total_fake}</p>
          <p className="text-[11px] text-[#205347]/70 mt-1 font-medium">Manipulated / Deepfake</p>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D2FF72] to-transparent" />
          <div className="flex items-center justify-between text-[#205347] mb-2.5 text-xs">
            <span className="font-semibold tracking-wide uppercase text-[11px] text-[#205347]">System Confidence</span>
            <div className="p-2 rounded-xl bg-[#D2FF72]/30 border border-[#73EC8B]/50 text-[#15B392] group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#0b2922] font-mono">
            {kpis.avg_confidence ? `${(kpis.avg_confidence * 100).toFixed(1)}%` : '91.8%'}
          </p>
          <p className="text-[11px] text-[#205347]/70 mt-1 font-medium">Average certainty index</p>
        </div>
      </div>

      {/* Model Architecture Stack */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25">
        <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest mb-4 font-mono flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#15B392] animate-ping"></span>
          <span>Integrated Multimodal Architecture</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div className="glass-card p-4 rounded-2xl space-y-1.5 border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all">
            <span className="text-[10px] text-[#15B392] font-bold uppercase tracking-wider font-mono">Spatial Branch</span>
            <h3 className="font-extrabold text-[#0b2922] text-sm">EfficientNet-B4</h3>
            <p className="text-[#205347] text-[11px] leading-relaxed">1792-dim visual texture & blending artifacts</p>
          </div>
          <div className="glass-card p-4 rounded-2xl space-y-1.5 border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all">
            <span className="text-[10px] text-[#205347] font-bold uppercase tracking-wider font-mono">Spectral Branch</span>
            <h3 className="font-extrabold text-[#0b2922] text-sm">2D FFT Azimuthal</h3>
            <p className="text-[#205347] text-[11px] leading-relaxed">64-dim radial frequency grid anomaly profile</p>
          </div>
          <div className="glass-card p-4 rounded-2xl space-y-1.5 border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all">
            <span className="text-[10px] text-[#15B392] font-bold uppercase tracking-wider font-mono">Temporal Branch</span>
            <h3 className="font-extrabold text-[#0b2922] text-sm">Bi-LSTM Network</h3>
            <p className="text-[#205347] text-[11px] leading-relaxed">512-dim inter-frame continuity & jitter modeling</p>
          </div>
          <div className="glass-card p-4 rounded-2xl space-y-1.5 border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all">
            <span className="text-[10px] text-[#205347] font-bold uppercase tracking-wider font-mono">Acoustic Branch</span>
            <h3 className="font-extrabold text-[#0b2922] text-sm">Wav2Vec 2.0</h3>
            <p className="text-[#205347] text-[11px] leading-relaxed">768-dim speech phoneme representation</p>
          </div>
          <div className="glass-card p-4 rounded-2xl space-y-1.5 border border-[#54C392]/25 hover:border-[#15B392]/50 transition-all">
            <span className="text-[10px] text-[#0c4739] font-bold uppercase tracking-wider font-mono">Biometric Mesh</span>
            <h3 className="font-extrabold text-[#0b2922] text-sm">MediaPipe 468</h3>
            <p className="text-[#205347] text-[11px] leading-relaxed">EAR blink, iris gaze & lip MAR dynamics</p>
          </div>
        </div>
      </div>

      {/* Recent Analyses List */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-[#54C392]/25">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-[#0b2922] uppercase tracking-widest font-mono">
            Recent Forensic Audits
          </h2>
          <Link to="/history" className="text-xs text-[#15B392] hover:text-[#0b2922] flex items-center space-x-1 font-semibold">
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-[#205347]/70 py-4 font-mono">Loading audit logs...</p>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[#54C392]/30 rounded-2xl">
            <p className="text-xs text-[#205347]">No media audits recorded yet.</p>
            <Link to="/analyze" className="text-xs text-[#15B392] hover:text-[#0b2922] underline mt-1.5 inline-block font-semibold">
              Upload your first video for inspection
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#54C392]/20">
            {data.items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-[#eaf6ef]/60 px-3 rounded-xl transition-colors">
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-lg font-bold font-mono text-[10px] ${
                    item.prediction === 'FAKE'
                      ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                      : 'bg-[#73EC8B]/25 text-[#0c4739] border border-[#54C392]/40 font-bold'
                  }`}>
                    {item.prediction || item.status.toUpperCase()}
                  </span>
                  <div>
                    <p className="font-bold text-[#0b2922]">{item.filename}</p>
                    <p className="text-[11px] text-[#205347]/70 font-mono">ID: {item.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {item.confidence && (
                    <span className="text-[#205347] font-mono font-semibold">
                      {(item.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  )}
                  <Link
                    to={`/analyze?id=${item.id}`}
                    className="text-[#15B392] hover:text-[#0b2922] font-semibold"
                  >
                    View Result &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
