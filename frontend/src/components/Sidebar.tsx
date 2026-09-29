import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Video, History, FileText, Settings, ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analyze', label: 'New Analysis', icon: Video },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/reports', label: 'Forensic Reports', icon: FileText },
    { to: '/settings', label: 'System & Models', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-[#54C392]/20 p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#205347]/70 font-mono">
          Navigation Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-[#73EC8B]/35 via-[#54C392]/20 to-transparent text-[#0b2922] border-[#15B392]/50 font-bold shadow-xs'
                    : 'border-transparent text-[#205347] hover:text-[#0b2922] hover:bg-[#e8f6ef]/70 hover:border-[#54C392]/30'
                }`
              }
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110 text-[#15B392]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="bg-gradient-to-b from-white/95 to-[#f0f9f4]/95 border border-[#54C392]/30 p-3.5 rounded-2xl text-xs text-[#205347] shadow-xs">
        <div className="flex items-center space-x-2 text-[#15B392] font-semibold mb-1">
          <ShieldCheck className="w-4 h-4 text-[#15B392]" />
          <span className="text-[#0b2922]">Multimodal Verification</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#205347]/80 font-mono">
          Spatial • Temporal • Audio • Lip-Sync • 468 Mesh Biometrics
        </p>
      </div>
    </aside>
  );
};
