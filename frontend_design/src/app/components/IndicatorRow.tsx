import React from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Clock, Zap } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

interface IndicatorProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const Indicator: React.FC<IndicatorProps> = ({ label, value, change, trend, icon }) => (
  <div className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors cursor-default group">
    <div className="flex items-center justify-between mb-3">
      <div className="p-2 bg-white/5 rounded-lg text-white/60 group-hover:text-blue-400 transition-colors">
        {icon}
      </div>
      {change && (
        <span className={`text-xs font-bold ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white/40'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className="text-xl font-mono font-bold text-white">{value}</div>
  </div>
);

export const IndicatorRow: React.FC = () => {
  const { volatility, sentiment } = useMarketData();

  return (
    <div className="flex flex-wrap gap-4 px-6 pb-6">
      <Indicator 
        label="Relative Strength Index" 
        value={(55 + (sentiment * 10)).toFixed(1)} 
        change="+2.4" 
        trend="up"
        icon={<Activity className="w-4 h-4" />}
      />
      <Indicator 
        label="24h Volume" 
        value="$12.4B" 
        change="-12%" 
        trend="down"
        icon={<BarChart3 className="w-4 h-4" />}
      />
      <Indicator 
        label="Order Flow Delta" 
        value={(sentiment * 1000).toFixed(0)} 
        change="+450" 
        trend={sentiment > 0 ? 'up' : 'down'}
        icon={<Zap className="w-4 h-4" />}
      />
      <Indicator 
        label="Market Dominance" 
        value="52.4%" 
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <Indicator 
        label="Time to Expiry" 
        value="04:22:15" 
        icon={<Clock className="w-4 h-4" />}
      />
    </div>
  );
};
