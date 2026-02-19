import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const CumulativeDelta: React.FC = () => {
  const { deltaData } = useMarketData();

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">Cumulative Delta</h3>
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Buying vs Selling Pressure</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[10px] font-bold text-white/40">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> CUMULATIVE VOLUME
          </span>
          <button className="p-1 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={deltaData}>
            <defs>
              <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#ffffff40" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#ffffff40" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="delta" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorDelta)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
