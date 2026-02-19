import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const TapeFeed: React.FC = () => {
  const { tape } = useMarketData();
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  const onMouseEnter = useCallback(() => {
    clearTimeout(resumeTimer.current);
    autoScrollRef.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    resumeTimer.current = setTimeout(() => { autoScrollRef.current = true; }, 3000);
  }, []);

  const maxSize = tape.length > 0 ? Math.max(...tape.map(t => t.size)) : 1;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col min-h-0">
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
        <div className="w-10 text-right">Side</div>
      </div>

      {tape.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest">
          Connecting to market feed...
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="flex-1 overflow-y-auto pr-2 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
        >
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {tape.map((event) => {
                const barPct = maxSize > 0 ? Math.min((event.size / maxSize) * 100, 100) : 0;
                const isBuy = event.side === 'buy';
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-center text-xs font-mono py-0.5 pl-3 border-l-2 ${
                      isBuy
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-rose-500/60 bg-rose-500/5'
                    }`}
                  >
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
                    <div className={`w-10 text-right text-[10px] font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isBuy ? 'BUY' : 'SELL'}
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
