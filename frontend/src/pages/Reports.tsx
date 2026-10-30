import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { api } from '../services/api';
import type { HistoryItem } from '../types/analysis';
import { useBackendStatus } from '../context/BackendStatusContext';

export const Reports: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useBackendStatus();

  useEffect(() => {
    if (isOnline) {
      setLoading(true);
      api.getHistory(0, 50)
        .then((res) => setItems(res.items.filter((i) => i.status === 'completed')))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOnline]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div>
        <div className="flex items-center space-x-2.5">
          <h1 className="text-2xl font-black text-white tracking-tight font-heading">
            Forensic Investigation Dossiers
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            IEEE COMPLIANT
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically compiled PDF forensic dossiers with Grad-CAM overlays, 468 landmark plots &amp; frequency graphs
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 font-mono">Loading investigation dossiers...</p>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-14 glass-panel border border-dashed border-slate-800 rounded-3xl">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">No completed forensic dossiers recorded yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">Run an analysis on any video to generate exportable PDF reports.</p>
          </div>
        ) : (
          items.map((item) => {
            const isFake = item.prediction === 'FAKE';
            return (
              <div
                key={item.id}
                className="glass-card rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {item.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold font-mono border ${
                      isFake
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {item.prediction}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white truncate mb-1.5 font-heading">{item.filename}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Certainty: <strong className="text-white">{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '—'}</strong>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href={api.getReportUrl(item.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-950" />
                    <span>Download PDF Dossier</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
