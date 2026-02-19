import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

export const TapeFeed: React.FC = () => {
  const { tape } = useMarketData();

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Tape Feed</h3>
          <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Real-time Time & Sales</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
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
        <div className="w-16 text-right">Size</div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {tape.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center text-xs font-mono py-1 border-l-2 pl-3 ${
                  event.side === 'buy' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'
                }`}
              >
                <div className="w-20 text-white/40">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className={`flex-1 font-bold ${event.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {event.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="w-16 text-right text-white">
                  {event.size.toFixed(4)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
