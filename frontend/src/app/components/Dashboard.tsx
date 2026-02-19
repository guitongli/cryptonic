import React from 'react';
import { Header } from './Header';
import { HeroOrb } from './HeroOrb';
import { IndicatorRow } from './IndicatorRow';
import { CumulativeDelta } from './CumulativeDelta';
import { TapeFeed } from './TapeFeed';
import { LiquidationFeed } from './LiquidationFeed';
import { PaperTrading } from './PaperTrading';
import { useMarketData } from './MarketDataWrapper';
import { MoreHorizontal } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { raw, sentiment } = useMarketData();
  const oi = raw.openInterest;
  const priceStruct = raw.priceStructure;
  const vwap = raw.vwap;
  const btcCorr = raw.btcCorrelation;

  const buyWallStrength = Math.max(0, Math.min(100, 50 + (raw.bidAskImbalance?.value ?? 0) * 50));
  const sellWallPressure = 100 - buyWallStrength;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Section 1: Header */}
      <Header />

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* Section 2 + 3: Hero Orb + Indicator Row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section 2: Hero Orb */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden min-h-[420px]">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Market Engine Active</span>
            </div>
            <div className="absolute top-6 right-6">
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <HeroOrb />
          </div>

          {/* Section 3: Indicator Row + Section 4: Cumulative Delta */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Section 3: Indicator Row */}
            <div className="relative bg-white/5 border border-white/10 rounded-2xl pt-6">
              <div className="absolute top-4 right-4 z-10">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pb-2">
                <h3 className="text-white font-bold text-base">Indicator Row</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Live Backend Signals</p>
              </div>
              <IndicatorRow />
            </div>

            {/* Section 4: Cumulative Delta */}
            <div className="flex-1 min-h-[260px]">
              <CumulativeDelta />
            </div>
          </div>
        </section>

        {/* Section 5 + 6 + 7: Tape Feed | Paper Trading | Liquidations */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto lg:h-[620px]">
          {/* Section 5: Tape Feed */}
          <div className="lg:col-span-1 h-[620px] lg:h-full min-h-0">
            <TapeFeed />
          </div>
          {/* Section 6: Paper Trading */}
          <div className="md:col-span-1 lg:col-span-1 h-[620px] lg:h-full min-h-0">
            <PaperTrading />
          </div>
          {/* Section 7: Liquidation Feed */}
          <div className="md:col-span-2 lg:col-span-1 h-[620px] lg:h-full min-h-0">
            <LiquidationFeed />
          </div>
        </section>

        {/* Intelligence footer panel */}
        <section className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-8 right-8">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-3xl">
            <h3 className="text-white font-bold text-2xl mb-2">Terminal Intelligence</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              {priceStruct?.trend
                ? `Price structure: ${priceStruct.trend}. `
                : ''}
              {vwap?.signal
                ? `VWAP signal: ${vwap.signal}. `
                : ''}
              {btcCorr?.signal
                ? `BTC correlation: ${btcCorr.signal} (${btcCorr.correlation?.toFixed(3)}). `
                : ''}
              {oi?.signal
                ? `Open interest: ${oi.signal} (${oi.openInterest?.toFixed(0)} ETH).`
                : 'Analysing live market structure…'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Buy Wall Strength</span>
                  <span className="text-emerald-400 font-mono">{buyWallStrength.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${buyWallStrength}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Sell Wall Pressure</span>
                  <span className="text-rose-400 font-mono">{sellWallPressure.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${sellWallPressure}%` }}
                  />
                </div>
              </div>
            </div>

            <button className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-colors text-sm">
              Activate AI Execution Module
            </button>
          </div>
        </section>

      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-40">
            <span className="text-xs font-bold tracking-tight text-white uppercase tracking-widest">Cryptonic © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Risk Disclosure</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
