import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const CumulativeDelta: React.FC = () => {
  const { deltaData, raw } = useMarketData();
  const connecting = Object.keys(raw).length === 0;

  const current = deltaData.length > 0 ? deltaData[deltaData.length - 1].delta : 0;
  const trending = deltaData.length >= 2 && deltaData[deltaData.length - 1].delta >= deltaData[deltaData.length - 2].delta;
  const strokeColor = connecting ? '#374151' : trending ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">Cumulative Delta</h3>
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Buy vs Sell Volume Pressure</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-bold text-white/40">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> BUYING
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> SELLING
            </span>
          </div>
          <div className={`text-sm font-mono font-bold ${trending ? 'text-emerald-400' : 'text-rose-400'}`}>
            {connecting ? '—' : `${current >= 0 ? '+' : ''}${current.toFixed(1)}`}
          </div>
          <button className="p-1 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={deltaData}>
            <defs>
              <linearGradient id="colorDeltaPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDeltaNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#ffffff40"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#ffffff40"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                borderColor: '#333',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toFixed(2)}`, 'Δ']}
            />
            <ReferenceLine y={0} stroke="#ffffff20" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="delta"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={trending ? 'url(#colorDeltaPos)' : 'url(#colorDeltaNeg)'}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
