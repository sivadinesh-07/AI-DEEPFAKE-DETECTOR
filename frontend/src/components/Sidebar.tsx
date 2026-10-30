import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Video, History, FileText, Settings, ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navSections = [
    {
      title: 'Forensic Operations',
      items: [
        { to: '/', label: 'Command Dashboard', icon: LayoutDashboard },
        { to: '/analyze', label: 'New Media Audit', icon: Video },
      ],
    },
    {
      title: 'Evidence & Records',
      items: [
        { to: '/history', label: 'Audit History', icon: History },
        { to: '/reports', label: 'Forensic Dossiers', icon: FileText },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { to: '/settings', label: 'Engine & Models', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-950/70 backdrop-blur-2xl border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0 shadow-2xl z-20">
      <div className="space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-300 border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.06)]'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-800'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                      )}
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Multimodal Telemetry Status Card */}
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 p-4 rounded-2xl text-xs space-y-2.5 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-200 font-mono tracking-tight text-[11px] font-bold">MULTIMODAL FUSION</span>
        </div>
        
        <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
          Spatial FFT • Bi-LSTM Jitter • Wav2Vec Audio • 468 MediaPipe
        </p>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Weights Verified</span>
          </span>
          <span className="text-cyan-400/80 font-bold">5 Models</span>
        </div>
      </div>
    </aside>
  );
};
