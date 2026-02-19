import React from 'react';
import { Activity, BarChart3, TrendingUp, Zap, GitMerge, DollarSign } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

interface IndicatorProps {
  label: string;
  value: string;
  subvalue?: string;
  signal?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'HIGH' | 'LOW' | 'NORMAL' | 'NONE' | string | null;
  icon: React.ReactNode;
  connecting?: boolean;
}

function signalColor(signal?: string | null) {
  if (!signal) return 'text-white/40';
  if (['BULLISH', 'HIGH'].includes(signal)) return 'text-emerald-400';
  if (['BEARISH', 'LOW'].includes(signal)) return 'text-rose-400';
  return 'text-white/40';
}

const Indicator: React.FC<IndicatorProps> = ({ label, value, subvalue, signal, icon, connecting }) => (
  <div className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors cursor-default group">
    <div className="flex items-center justify-between mb-3">
      <div className="p-2 bg-white/5 rounded-lg text-white/60 group-hover:text-blue-400 transition-colors">
        {icon}
      </div>
      {signal && signal !== 'NONE' && signal !== 'NEUTRAL' && signal !== 'NORMAL' && (
        <span className={`text-[10px] font-bold tracking-widest uppercase ${signalColor(signal)}`}>
          {signal}
        </span>
      )}
    </div>
    <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className="text-lg font-mono font-bold text-white">
      {connecting ? '—' : value}
    </div>
    {subvalue && !connecting && (
      <div className="text-[10px] text-white/30 font-mono mt-0.5">{subvalue}</div>
    )}
  </div>
);

export const IndicatorRow: React.FC = () => {
  const { sentiment, raw } = useMarketData();
  const connecting = Object.keys(raw).length === 0;

  const bidAsk = raw.bidAskImbalance;
  const volIntensity = raw.volumeIntensity;
  const tradeRate = raw.tradeRate;
  const btcCorr = raw.btcCorrelation;
  const fundingRate = raw.fundingRate;
  const bookTicker = raw.bookTicker;

  // Bid/Ask Imbalance: -1 to +1 → display as 0-100 RSI-style
  const imbalVal = bidAsk?.value ?? 0;
  const imbalDisplay = (50 + imbalVal * 50).toFixed(1);

  // Volume intensity: multiplier vs recent median
  const viVal = volIntensity?.value ?? 1;
  const viDisplay = `${viVal.toFixed(2)}×`;

  // Trade rate: trades per second
  const rateVal = tradeRate?.rate ?? 0;
  const rateDisplay = `${rateVal.toFixed(1)}/s`;

  // BTC correlation: -1 to +1
  const corrVal = btcCorr?.correlation ?? 0;
  const corrDisplay = corrVal.toFixed(3);

  // Funding rate: % per 8h
  const fundingVal = fundingRate?.rate ?? 0;
  const fundingDisplay = fundingRate ? `${(fundingVal * 100).toFixed(4)}%` : '—';
  const fundingSignal = fundingVal > 0 ? 'BULLISH' : fundingVal < 0 ? 'BEARISH' : 'NEUTRAL';

  // Spread
  const spread = bookTicker?.spread ?? null;
  const spreadDisplay = spread != null ? `$${spread.toFixed(4)}` : '—';

  return (
    <div className="flex flex-wrap gap-3 px-6 pb-6">
      <Indicator
        label="Bid/Ask Imbalance"
        value={imbalDisplay}
        signal={bidAsk?.signal}
        icon={<Activity className="w-4 h-4" />}
        connecting={connecting}
      />
      <Indicator
        label="Volume Intensity"
        value={viDisplay}
        signal={volIntensity?.signal}
        icon={<BarChart3 className="w-4 h-4" />}
        connecting={connecting}
      />
      <Indicator
        label="Trade Rate"
        value={rateDisplay}
        icon={<Zap className="w-4 h-4" />}
        connecting={connecting}
      />
      <Indicator
        label="BTC Correlation"
        value={corrDisplay}
        signal={btcCorr?.signal}
        icon={<GitMerge className="w-4 h-4" />}
        connecting={connecting}
      />
      <Indicator
        label="Funding Rate"
        value={fundingDisplay}
        signal={fundingRate ? fundingSignal : null}
        icon={<DollarSign className="w-4 h-4" />}
        connecting={connecting}
      />
      <Indicator
        label="Spread"
        value={spreadDisplay}
        icon={<TrendingUp className="w-4 h-4" />}
        connecting={connecting}
      />
    </div>
  );
};
