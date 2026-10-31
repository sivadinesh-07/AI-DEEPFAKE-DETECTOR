import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Eye, Search, Database } from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import type { HistoryItem } from '../types/analysis';
import { useBackendStatus } from '../context/BackendStatusContext';

export const History: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fake' | 'real'>('all');
  const { isOnline } = useBackendStatus();

  const loadHistory = () => {
    setLoading(true);
    api.getHistory(0, 100)
      .then((res) => setItems(res.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOnline) {
      loadHistory();
    }
  }, [isOnline]);

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to purge audit record ${id}?`)) {
      try {
        await api.deleteAnalysis(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const filtered = items
    .filter((i) => {
      if (filterType === 'fake') return i.prediction === 'FAKE';
      if (filterType === 'real') return i.prediction === 'REAL';
      return true;
    })
    .filter((i) =>
      i.filename.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-heading">
            Forensic Audit Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically indexed media verification logs, inference diagnostics &amp; chain of custody
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 w-56 sm:w-64 transition-all shadow-inner font-mono"
            />
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('fake')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'fake' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fake
            </button>
            <button
              onClick={() => setFilterType('real')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterType === 'real' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Real
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 font-mono">
            Loading forensic ledger items...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300">No media audit records match your query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-widest font-bold text-[10px] font-mono">
                <tr>
                  <th className="px-6 py-4">Audit ID</th>
                  <th className="px-6 py-4">Media Filename</th>
                  <th className="px-6 py-4">Forensic Verdict</th>
                  <th className="px-6 py-4">Certainty</th>
                  <th className="px-6 py-4">Inference Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((item) => {
                  const isFake = item.prediction === 'FAKE';
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-cyan-400">{item.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-200 truncate max-w-xs">{item.filename}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono border ${
                          isFake
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {item.prediction || item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {item.processing_time ? `${item.processing_time}s` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/analyze?id=${item.id}`}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer shadow-xs"
                            title="Inspect Analysis"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {item.report_url && (
                            <a
                              href={resolveMediaUrl(item.report_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 transition-colors shadow-xs"
                              title="Download PDF Dossier"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                            title="Purge Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
