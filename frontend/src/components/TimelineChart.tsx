import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import type { TimelineItem } from '../types/analysis';
import { Activity } from 'lucide-react';

interface TimelineChartProps {
  timeline: TimelineItem[];
  onSeek?: (timestamp: number) => void;
  selectedTimestamp?: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ timeline, onSeek, selectedTimestamp }) => {
  const chartData = timeline.map((item) => ({
    frame: item.frame,
    timestamp: item.timestamp,
    timeLabel: `${item.timestamp.toFixed(2)}s`,
    anomaly: Math.round(item.anomaly_score * 100),
  }));

  const handleClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0 && onSeek) {
      const ts = data.activePayload[0].payload.timestamp;
      onSeek(ts);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-heading">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Bi-LSTM Temporal Anomaly Sequence Timeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inter-frame feature drift and temporal continuity score evaluated across sampled video keyframes
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            <span className="text-slate-300">Threshold (&gt;50%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
            <span className="text-slate-300">Residual Curve</span>
          </div>
        </div>
      </div>

      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} onClick={handleClick} className="cursor-pointer">
            <defs>
              <linearGradient id="cyberAnomalyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeLabel"
              stroke="#475569"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#475569"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
              unit="%"
            />
            <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} />
            {selectedTimestamp !== undefined && (
              <ReferenceLine x={`${selectedTimestamp.toFixed(2)}s`} stroke="#00F0FF" strokeWidth={2} />
            )}
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
              formatter={(val: any) => [`${val}% Anomaly`, 'Residual']}
              labelFormatter={(label: any) => `Video Timestamp: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="anomaly"
              stroke="#00F0FF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#cyberAnomalyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-400 text-center font-mono">
        Click any coordinate along the timeline to scrub and seek directly to that video timestamp.
      </p>
    </div>
  );
};
