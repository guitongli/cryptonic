import React from 'react';
import { Header } from './Header';
import { HeroOrb } from './HeroOrb';
import { IndicatorRow } from './IndicatorRow';
import { CumulativeDelta } from './CumulativeDelta';
import { TapeFeed } from './TapeFeed';
import { LiquidationFeed } from './LiquidationFeed';
import { PaperTrading } from './PaperTrading';
import { MoreHorizontal } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      <Header />
      
      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
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

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="relative">
              <div className="absolute top-4 right-4 z-10">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <IndicatorRow />
            </div>
            <div className="flex-1">
              <CumulativeDelta />
            </div>
          </div>
        </section>

        {/* Secondary Feeds & Trading */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
          <div className="lg:col-span-1 h-[600px] lg:h-full min-h-0">
            <TapeFeed />
          </div>
          <div className="lg:col-span-1 h-[600px] lg:h-full min-h-0">
            <LiquidationFeed />
          </div>
          <div className="md:col-span-2 lg:col-span-1 h-[600px] lg:h-full min-h-0">
            <PaperTrading />
          </div>
        </section>

        {/* Intelligence Section */}
        <section className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-8 right-8">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-2xl">
            <h3 className="text-white font-bold text-2xl mb-2">Terminal Intelligence</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Our proprietary AI model is currently detecting high-frequency absorption patterns at the 52.4k level. 
              Market sentiment is shifting towards localized bull-parity, suggesting a consolidation phase before the next volatility expansion.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Buy Wall Strength</span>
                  <span className="text-emerald-400 font-mono">88.4%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[88.4%] h-full bg-emerald-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Sell Wall Pressure</span>
                  <span className="text-rose-400 font-mono">12.6%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[12.6%] h-full bg-rose-500" />
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
            <span className="text-xs font-bold tracking-tight text-white uppercase tracking-widest">QuantFlow © 2026</span>
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
