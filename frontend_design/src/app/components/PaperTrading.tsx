import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

export const PaperTrading: React.FC = () => {
  const [balance, setBalance] = useState(100000);
  const [amount, setAmount] = useState('');
  const [positions, setPositions] = useState([
    { id: 1, type: 'long', entry: 51200, size: 0.5, pnl: 1240, status: 'open' },
    { id: 2, type: 'short', entry: 53100, size: 0.2, pnl: -450, status: 'open' },
  ]);

  const handleTrade = (type: 'long' | 'short') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    
    const newPos = {
      id: Date.now(),
      type,
      entry: 52432.50, // Mock current price
      size: val,
      pnl: 0,
      status: 'open'
    };
    setPositions([newPos, ...positions]);
    setAmount('');
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-none">Paper Trading</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mt-1">Live Simulation</p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Buying Power</span>
          <div className="text-xl font-mono font-bold text-white mt-1">${balance.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Unrealized PNL</span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">+$790.00</div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Order Size (BTC)"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            BTC
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleTrade('long')}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-colors text-sm"
          >
            <TrendingUp className="w-4 h-4" /> BUY / LONG
          </button>
          <button 
            onClick={() => handleTrade('short')}
            className="flex items-center justify-center gap-2 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-sm"
          >
            <TrendingDown className="w-4 h-4" /> SELL / SHORT
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <h4 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Open Positions</h4>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 [scrollbar-width:thin]">
          {positions.map((pos) => (
            <div key={pos.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${pos.type === 'long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {pos.type === 'long' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-tight">{pos.type} BTC</div>
                  <div className="text-[10px] text-white/40 font-mono">@{pos.entry.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toLocaleString()}
                </div>
                <div className="text-[10px] text-white/40 font-mono">{pos.size} BTC</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
