import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, AlertTriangle, MoreHorizontal, Zap } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const LiquidationFeed: React.FC = () => {
  const { liquidations, raw } = useMarketData();

  const liqFeed = raw.liquidationFeed;
  const cascade = liqFeed?.cascade ?? false;
  const cascadeSignal = liqFeed?.signal ?? 'NONE';

  // Buy wall / sell wall from bid/ask imbalance
  const bidAsk = raw.bidAskImbalance;
  const imbalVal = bidAsk?.value ?? 0;
  const buyWall = Math.max(0, Math.min(100, (50 + imbalVal * 50)));
  const sellWall = 100 - buyWall;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Liquidations</h3>
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">
            {cascade
              ? `⚡ ${cascadeSignal} CASCADE`
              : 'Whale Activity Tracker'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cascade ? (
            <div className="p-2 bg-amber-500/10 rounded-full animate-pulse">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
          ) : (
            <div className="p-2 bg-rose-500/10 rounded-full">
              <Skull className="w-4 h-4 text-rose-500" />
            </div>
          )}
          <button className="p-1 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buy / Sell wall pressure bars */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-white/40">Buy Wall</span>
            <span className="text-emerald-400 font-mono">{buyWall.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${buyWall}%` }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-white/40">Sell Wall</span>
            <span className="text-rose-400 font-mono">{sellWall.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${sellWall}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {liquidations.map((liq) => (
              <motion.div
                key={liq.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  liq.side === 'long' ? 'bg-rose-500' : 'bg-emerald-500'
                }`} />

                <div className="flex items-start justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    liq.side === 'long' ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {liq.side === 'long' ? 'LONG LIQUIDATED' : 'SHORT LIQUIDATED'}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {new Date(liq.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-white font-mono font-bold text-sm">
                    {liq.amount >= 1_000_000
                      ? `$${(liq.amount / 1_000_000).toFixed(2)}M`
                      : liq.amount >= 1_000
                        ? `$${(liq.amount / 1_000).toFixed(0)}K`
                        : `$${liq.amount.toFixed(0)}`}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/60">
                    @ <span className="text-white font-mono">${liq.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {liq.amount > 500_000 && (
                  <motion.div
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 1, repeat: 2 }}
                    className="absolute inset-0 bg-amber-500/20 pointer-events-none"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {liquidations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/20">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs font-bold uppercase tracking-widest">Scanning Market...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
