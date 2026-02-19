import React from 'react';
import { motion } from 'motion/react';
import { useMarketData } from './MarketDataWrapper';

export const HeroOrb: React.FC = () => {
  const { currentPrice, priceChange, volatility, sentiment, raw } = useMarketData();
  const connecting = currentPrice === 0;

  // Glow color: green (bullish) / red (bearish) / blue (neutral)
  const getGlowColor = () => {
    if (connecting) return 'rgba(30, 30, 30, 0.4)';
    if (sentiment > 0.2) return 'rgba(52, 211, 153, 0.4)';  // emerald
    if (sentiment < -0.2) return 'rgba(251, 113, 133, 0.4)'; // rose
    return 'rgba(59, 130, 246, 0.4)';                         // blue
  };

  const sentimentLabel = sentiment > 0.2 ? 'BULLISH' : sentiment < -0.2 ? 'BEARISH' : 'NEUTRAL';
  const vwap = raw?.vwap?.vwap;

  return (
    <div className="relative aspect-square w-full max-w-[360px] mx-auto flex items-center justify-center">
      {/* Outer glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full blur-[80px]"
        style={{ backgroundColor: getGlowColor() }}
      />

      {/* Rotating rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 border border-white/5 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-4 border border-white/10 rounded-full border-dashed"
      />

      {/* Central orb */}
      <div className="relative z-10 w-56 h-56 rounded-full bg-black flex flex-col items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 opacity-40 bg-gradient-to-b from-blue-500/20 via-transparent to-purple-500/20"
        />

        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">
          {connecting ? 'CONNECTING...' : 'ETH / USDT PERP'}
        </div>

        <div className="text-3xl font-mono font-bold text-white mb-2">
          {connecting
            ? '—'
            : `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>

        {!connecting && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            priceChange >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(3)}%
          </div>
        )}

        {/* Volatility pulse */}
        <motion.div
          animate={{ scale: [1, 1 + volatility * 0.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute inset-0 border-2 border-white/10 rounded-full"
        />
      </div>

      {/* Floating chips */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
        <div className="px-3 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-sm text-[10px] font-bold text-white/60 whitespace-nowrap">
          VOLATILITY: {connecting ? '—' : `${(volatility * 100).toFixed(0)}%`}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2">
        <div className={`px-3 py-1 rounded-md bg-black/60 border backdrop-blur-sm text-[10px] font-bold whitespace-nowrap ${
          connecting
            ? 'border-white/10 text-white/60'
            : sentiment > 0.2
              ? 'border-emerald-500/30 text-emerald-400'
              : sentiment < -0.2
                ? 'border-rose-500/30 text-rose-400'
                : 'border-white/10 text-white/60'
        }`}>
          {connecting ? 'LOADING...' : sentimentLabel}
        </div>
      </div>

      {vwap && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">
          <div className="px-2 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-sm text-[9px] font-bold text-white/50">
            VWAP<br />${vwap.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};
