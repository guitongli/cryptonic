import React from 'react';
import { Activity, BarChart3, TrendingUp, Zap, GitMerge, DollarSign, MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

interface IndicatorProps {
  label: string;
  value: string;
  signal?: string | null;
  icon: React.ReactNode;
  connecting?: boolean;
  indicatorKey: string;
  onOpenMapping?: (key: string) => void;
}

function signalColor(signal?: string | null) {
  if (!signal) return 'text-white/40';
  if (['BULLISH', 'HIGH'].includes(signal)) return 'text-emerald-400';
  if (['BEARISH', 'LOW'].includes(signal)) return 'text-rose-400';
  return 'text-white/40';
}

const Indicator: React.FC<IndicatorProps> = ({
  label, value, signal, icon, connecting, indicatorKey, onOpenMapping,
}) => (
  <div className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors cursor-default group relative">
    <div className="flex items-center justify-between mb-3">
      <div className="p-2 bg-white/5 rounded-lg text-white/60 group-hover:text-blue-400 transition-colors">
        {icon}
      </div>
      <div className="flex items-center gap-2">
        {signal && !['NONE', 'NEUTRAL', 'NORMAL'].includes(signal) && (
          <span className={`text-[10px] font-bold tracking-widest uppercase ${signalColor(signal)}`}>
            {signal}
          </span>
        )}
        {onOpenMapping && (
          <button
            onClick={() => onOpenMapping(indicatorKey)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg transition-all text-white/30 hover:text-blue-400"
            title="Add sound mapping"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
    <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className="text-lg font-mono font-bold text-white">
      {connecting ? '—' : value}
    </div>
  </div>
);

interface IndicatorRowProps {
  onOpenMapping?: (indicatorName: string) => void;
}

export const IndicatorRow: React.FC<IndicatorRowProps> = ({ onOpenMapping }) => {
  const { raw } = useMarketData();
  const connecting = Object.keys(raw).length === 0;

  const bidAsk      = raw.bidAskImbalance as any;
  const volIntensity = raw.volumeIntensity as any;
  const tradeRate   = raw.tradeRate as any;
  const btcCorr     = raw.btcCorrelation as any;
  const fundingRate = raw.fundingRate as any;
  const bookTicker  = raw.bookTicker as any;

  const imbalVal = bidAsk?.value ?? 0;
  const viVal    = volIntensity?.value ?? 1;
  const rateVal  = tradeRate?.rate ?? 0;
  const corrVal  = btcCorr?.correlation ?? 0;
  const fundingVal = fundingRate?.rate ?? 0;
  const spread   = bookTicker?.spread ?? null;

  const fundingSignal = fundingVal > 0 ? 'BULLISH' : fundingVal < 0 ? 'BEARISH' : 'NEUTRAL';

  return (
    <div className="flex flex-wrap gap-3 px-6 pb-6">
      <Indicator
        label="Bid/Ask Imbalance"
        value={(50 + imbalVal * 50).toFixed(1)}
        signal={bidAsk?.signal}
        icon={<Activity className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="bidAskImbalance"
        onOpenMapping={onOpenMapping}
      />
      <Indicator
        label="Volume Intensity"
        value={`${viVal.toFixed(2)}×`}
        signal={volIntensity?.signal}
        icon={<BarChart3 className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="volumeIntensity"
        onOpenMapping={onOpenMapping}
      />
      <Indicator
        label="Trade Rate"
        value={`${rateVal.toFixed(1)}/s`}
        icon={<Zap className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="tradeRate"
        onOpenMapping={onOpenMapping}
      />
      <Indicator
        label="BTC Correlation"
        value={corrVal.toFixed(3)}
        signal={btcCorr?.signal}
        icon={<GitMerge className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="btcCorrelation"
        onOpenMapping={onOpenMapping}
      />
      <Indicator
        label="Funding Rate"
        value={fundingRate ? `${(fundingVal * 100).toFixed(4)}%` : '—'}
        signal={fundingRate ? fundingSignal : null}
        icon={<DollarSign className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="fundingRate"
        onOpenMapping={onOpenMapping}
      />
      <Indicator
        label="Spread"
        value={spread != null ? `$${spread.toFixed(4)}` : '—'}
        icon={<TrendingUp className="w-4 h-4" />}
        connecting={connecting}
        indicatorKey="spread"
        onOpenMapping={onOpenMapping}
      />
    </div>
  );
};
