import React from 'react';
import { Search, Bell, Menu, User, ChevronDown, Zap } from 'lucide-react';
import { useMarketData } from './MarketDataWrapper';

interface HeaderProps { onOpenMapping?: (key: string) => void; }

export const Header: React.FC<HeaderProps> = ({ onOpenMapping }) => {
  const { currentPrice, priceChange } = useMarketData();
  const connecting = currentPrice === 0;

  return (
    <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            CRYPTO<span className="text-blue-500">NIC</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
          <a href="#" className="text-white hover:text-white transition-colors">Dashboard</a>
          <a href="#" className="hover:text-white transition-colors">Markets</a>
          <a href="#" className="hover:text-white transition-colors">Portfolio</a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            Tools <ChevronDown className="w-4 h-4" />
          </a>
        </nav>
      </div>

      <div className="flex-1 max-w-md mx-12 hidden lg:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search assets, indicators..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end">
          <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">ETH / USDT PERP</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-white">
              {connecting
                ? '—'
                : `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            {!connecting && (
              <span className={`text-xs font-medium ${priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
            <Bell className="w-5 h-5 text-white/60" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-black" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <Menu className="w-5 h-5 text-white/60 lg:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
};
