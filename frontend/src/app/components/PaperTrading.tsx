import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MoreHorizontal, X, RotateCcw } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

const API = 'http://localhost:3000';

interface Position {
  id: number;
  type: 'long' | 'short';
  symbol: string;
  entry: number;
  size: number;
  leverage: number;
  openedAt: number;
}

export const PaperTrading: React.FC = () => {
  const { currentPrice } = useMarketData();
  const [balance, setBalance] = useState(100_000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [loading, setLoading] = useState(false);

  const livePrice = currentPrice > 0 ? currentPrice : 0;

  // Fetch persisted state on mount so positions survive page refresh
  useEffect(() => {
    fetch(`${API}/paper/state`)
      .then(r => r.json())
      .then(data => {
        setBalance(data.balance);
        setPositions(data.positions);
      })
      .catch(() => {});
  }, []);

  // Live PnL computed client-side — updates every price tick without polling
  const positionsWithPnl = positions.map((pos) => {
    const priceDiff = livePrice > 0
      ? (pos.type === 'long' ? livePrice - pos.entry : pos.entry - livePrice)
      : 0;
    return { ...pos, pnl: priceDiff * pos.size * pos.leverage };
  });

  const totalPnl = positionsWithPnl.reduce((sum, p) => sum + p.pnl, 0);

  const applyState = (data: { balance: number; positions: Position[] }) => {
    setBalance(data.balance);
    setPositions(data.positions);
  };

  const handleTrade = async (type: 'long' | 'short') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || livePrice === 0) return;
    if (val * livePrice > balance) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/paper/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, size: val, leverage }),
      });
      if (res.ok) {
        const data = await res.json();
        applyState(data.state);
        setAmount('');
      }
    } finally {
      setLoading(false);
    }
  };

  const closePosition = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/paper/order/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        applyState(data.state);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const res = await fetch(`${API}/paper/reset`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      applyState(data.state);
    }
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
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mt-1">
              Live Simulation — ETH/USDT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-rose-400"
            title="Reset account to $100,000"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Available Balance</span>
          <div className="text-lg font-mono font-bold text-white mt-1">
            ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Unrealized PNL</span>
          <div className={`text-lg font-mono font-bold mt-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Order entry */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={livePrice > 0 ? `Size (ETH) — price $${livePrice.toFixed(2)}` : 'Connecting...'}
            disabled={livePrice === 0 || loading}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-colors text-white placeholder-white/20 disabled:opacity-40"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            ETH
          </div>
        </div>

        {/* Leverage selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mr-1">Leverage</span>
          {[1, 2, 5, 10].map((lv) => (
            <button
              key={lv}
              onClick={() => setLeverage(lv)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                leverage === lv
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {lv}×
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTrade('long')}
            disabled={livePrice === 0 || loading}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold rounded-xl transition-colors text-sm"
          >
            <TrendingUp className="w-4 h-4" /> BUY / LONG
          </button>
          <button
            onClick={() => handleTrade('short')}
            disabled={livePrice === 0 || loading}
            className="flex items-center justify-center gap-2 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-sm"
          >
            <TrendingDown className="w-4 h-4" /> SELL / SHORT
          </button>
        </div>
      </div>

      {/* Open positions */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <h4 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">
          Open Positions ({positions.length})
        </h4>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
          {positionsWithPnl.length === 0 ? (
            <div className="text-center py-6 text-white/20 text-xs font-bold uppercase tracking-widest">
              No open positions
            </div>
          ) : (
            positionsWithPnl.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    pos.type === 'long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {pos.type === 'long' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-tight">
                      {pos.type.toUpperCase()} ETH{pos.leverage > 1 && <span className="text-blue-400 ml-1">×{pos.leverage}</span>}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono">
                      @${pos.entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono">{pos.size} ETH</div>
                  </div>
                  <button
                    onClick={() => closePosition(pos.id)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded-lg transition-all text-white/40 hover:text-rose-400 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
