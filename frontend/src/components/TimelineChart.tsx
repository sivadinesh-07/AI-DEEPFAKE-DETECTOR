import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import type { TimelineItem } from '../types/analysis';
import { Clock } from 'lucide-react';

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
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-[#54C392]/25 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#0b2922] flex items-center space-x-2 font-sans">
            <Clock className="w-4 h-4 text-[#15B392]" />
            <span>Bi-LSTM Temporal Anomaly Timeline</span>
          </h3>
          <p className="text-xs text-[#205347] mt-0.5">Inter-frame continuity score across sampled video sequence</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
            <span className="text-[#205347]">Threshold (&gt;50%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15B392] shadow-[0_0_8px_rgba(21,179,146,0.5)]"></span>
            <span className="text-[#205347]">Anomaly Curve</span>
          </div>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} onClick={handleClick} className="cursor-pointer">
            <defs>
              <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#15B392" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#73EC8B" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" stroke="#54C392" tick={{ fontSize: 11, fill: '#205347' }} />
            <YAxis domain={[0, 100]} stroke="#54C392" tick={{ fontSize: 11, fill: '#205347' }} unit="%" />
            <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} />
            {selectedTimestamp !== undefined && (
              <ReferenceLine x={`${selectedTimestamp.toFixed(2)}s`} stroke="#15B392" strokeWidth={2} />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(84, 195, 146, 0.4)',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#0b2922',
                boxShadow: '0 10px 25px -5px rgba(21, 179, 146, 0.15)',
              }}
              formatter={(val: any) => [`${val}% Anomaly`, 'Score']}
              labelFormatter={(label: any) => `Timestamp: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="anomaly"
              stroke="#15B392"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#anomalyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-[#205347]/70 text-center mt-2 font-mono">
        Click any coordinate on the timeline to scrub and seek the video to that timestamp.
      </p>
    </div>
  );
};
