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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b2922] tracking-tight font-sans">Forensic Audit Dossiers</h1>
        <p className="text-xs text-[#205347] mt-0.5">Download IEEE-compliant PDF investigation reports for academic or judicial review</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="text-xs text-[#205347]/70 py-6 font-mono">Loading reports...</p>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-12 glass-panel border border-dashed border-[#54C392]/30 rounded-3xl">
            <FileText className="w-10 h-10 text-[#54C392]/60 mx-auto mb-2" />
            <p className="text-xs text-[#205347] font-medium">No completed reports available yet.</p>
          </div>
        ) : (
          items.map((item) => {
            const isFake = item.prediction === 'FAKE';
            return (
              <div
                key={item.id}
                className="glass-card rounded-3xl p-6 shadow-sm border border-[#54C392]/25 flex flex-col justify-between hover:border-[#15B392]/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-[#15B392] font-bold">{item.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold font-mono border ${
                      isFake
                        ? 'bg-rose-500/15 text-rose-600 border-rose-500/40'
                        : 'bg-[#73EC8B]/25 text-[#0c4739] border-[#54C392]/40 font-bold'
                    }`}>
                      {item.prediction}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b2922] truncate mb-1">{item.filename}</h3>
                  <p className="text-xs text-[#205347] font-mono">
                    Confidence: <strong className="text-[#0b2922]">{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '—'}</strong>
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#54C392]/25 flex items-center justify-between">
                  <a
                    href={api.getReportUrl(item.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] hover:from-[#0fa082] hover:to-[#43aa7d] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#15B392]/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
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
