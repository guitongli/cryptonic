import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const TapeFeed: React.FC = () => {
  const { tape } = useMarketData();

  // tape is already newest-first (prepended in state, capped at 20)
  const maxSize = tape.length > 0 ? Math.max(...tape.map(t => t.size)) : 1;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Tape Feed</h3>
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Real-time Time &amp; Sales</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold animate-pulse">
            LIVE
          </div>
          <button className="p-1 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">
        <div className="w-20">Time</div>
        <div className="flex-1">Price</div>
        <div className="w-20">Bar</div>
        <div className="w-16 text-right">Size</div>
        <div className="w-10 text-right">#</div>
      </div>

      {tape.length === 0 ? (
        <div className="py-8 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest">
          Connecting to market feed...
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {tape.map((event, index) => {
                const barPct = maxSize > 0 ? Math.min((event.size / maxSize) * 100, 100) : 0;
                const isBuy = event.side === 'buy';
                const isLatest = index === 0;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`relative overflow-hidden flex items-center text-xs font-mono py-0.5 pl-3 border-l-2 ${
                      isBuy
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-rose-500/60 bg-rose-500/5'
                    }`}
                  >
                    {isLatest && (
                      <motion.div
                        key={`flash-${event.id}`}
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        style={{ backgroundColor: isBuy ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
                      />
                    )}
                    <div className="w-20 text-white/30 text-[10px]">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className={`flex-1 font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {event.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="w-20 px-1">
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right text-white/60">
                      {event.size.toFixed(3)}
                    </div>
                    <div className={`w-10 text-right text-[10px] font-bold tabular-nums ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {event.count}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
