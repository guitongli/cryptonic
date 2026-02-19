import React from 'react';
import { motion } from 'motion/react';
import { useMarketData } from './MarketDataWrapper';

export const HeroOrb: React.FC = () => {
  const { currentPrice, priceChange, volatility, sentiment } = useMarketData();

  // Color logic based on sentiment
  const getGlowColor = () => {
    if (sentiment > 0.3) return 'rgba(52, 211, 153, 0.4)'; // Emerald
    if (sentiment < -0.3) return 'rgba(251, 113, 133, 0.4)'; // Rose
    return 'rgba(59, 130, 246, 0.4)'; // Blue
  };

  return (
    <div className="relative aspect-square w-full max-w-[400px] mx-auto flex items-center justify-center">
      {/* Background Glows */}
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full blur-[80px]"
        style={{ backgroundColor: getGlowColor() }}
      />
      
      <motion.div 
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 border border-white/5 rounded-full"
      />

      <motion.div 
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-4 border border-white/10 rounded-full border-dashed"
      />

      {/* The Central Orb */}
      <div className="relative z-10 w-64 h-64 rounded-full bg-black flex flex-col items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Animated Gradient Background */}
        <motion.div 
          animate={{
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 opacity-40 bg-gradient-to-b from-blue-500/20 via-transparent to-purple-500/20"
        />

        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Live Index</div>
        <div className="text-4xl font-mono font-bold text-white mb-2">
          {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${priceChange >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
        </div>

        {/* Pulse effect based on volatility */}
        <motion.div 
          animate={{
            scale: [1, 1 + (volatility * 0.1), 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
          className="absolute inset-0 border-2 border-white/10 rounded-full"
        />
      </div>

      {/* Floating Indicators around the orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
        <div className="px-3 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-sm text-[10px] font-bold text-white/60">
          VOLATILITY: {(volatility * 100).toFixed(0)}%
        </div>
      </div>
      
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4">
        <div className="px-3 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-sm text-[10px] font-bold text-white/60">
          SENTIMENT: {sentiment > 0 ? 'BULLISH' : 'BEARISH'}
        </div>
      </div>
    </div>
  );
};
