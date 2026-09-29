import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Eye, Search } from 'lucide-react';
import { api } from '../services/api';
import type { HistoryItem } from '../types/analysis';
import { useBackendStatus } from '../context/BackendStatusContext';

export const History: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    if (window.confirm(`Are you sure you want to delete audit ${id}?`)) {
      try {
        await api.deleteAnalysis(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const filtered = items.filter((i) =>
    i.filename.toLowerCase().includes(search.toLowerCase()) ||
    i.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b2922] tracking-tight font-sans">Forensic Audit History</h1>
          <p className="text-xs text-[#205347] mt-0.5">Archived analysis logs, verification reports, and metadata</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#15B392] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white/90 border border-[#54C392]/30 rounded-xl text-xs text-[#0b2922] placeholder-[#205347]/50 focus:outline-none focus:border-[#15B392] focus:ring-1 focus:ring-[#15B392]/30 w-64 transition-all shadow-xs font-mono"
          />
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-[#54C392]/25 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#205347]/60 font-mono">Loading audit history...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#205347]/70">
            No audits match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f8f4] border-b border-[#54C392]/20 text-[#205347] uppercase tracking-widest font-bold text-[10px] font-mono">
                <tr>
                  <th className="px-6 py-4">Analysis ID</th>
                  <th className="px-6 py-4">Media Filename</th>
                  <th className="px-6 py-4">Verdict</th>
                  <th className="px-6 py-4">Confidence</th>
                  <th className="px-6 py-4">Processing Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#54C392]/15">
                {filtered.map((item) => {
                  const isFake = item.prediction === 'FAKE';
                  return (
                    <tr key={item.id} className="hover:bg-[#eaf6ef]/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-[#15B392]">{item.id}</td>
                      <td className="px-6 py-4 font-bold text-[#0b2922] truncate max-w-xs">{item.filename}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono border ${
                          isFake
                            ? 'bg-rose-500/15 text-rose-600 border-rose-500/40 shadow-xs'
                            : 'bg-[#73EC8B]/25 text-[#0c4739] border-[#54C392]/40 shadow-xs'
                        }`}>
                          {item.prediction || item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[#0b2922]">
                        {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-[#205347] font-mono">
                        {item.processing_time ? `${item.processing_time}s` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/analyze?id=${item.id}`}
                            className="p-1.5 rounded-lg bg-white hover:bg-[#eef8f3] text-[#205347] hover:text-[#15B392] border border-[#54C392]/30 hover:border-[#15B392]/50 transition-all cursor-pointer shadow-xs"
                            title="View Analysis"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {item.report_url && (
                            <a
                              href={item.report_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[#15B392]/15 hover:bg-[#15B392]/25 text-[#15B392] transition-colors shadow-xs"
                              title="Download PDF Report"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                            title="Delete Record"
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
