import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Header } from './Header';
import { HeroOrb } from './HeroOrb';
import { IndicatorRow } from './IndicatorRow';
import { CumulativeDelta } from './CumulativeDelta';
import { TapeFeed } from './TapeFeed';
import { LiquidationFeed } from './LiquidationFeed';
import { PaperTrading } from './PaperTrading';
import { SoundMappingModal } from './sound/SoundMappingModal';
import { SoundFooter } from './sound/SoundFooter';
import { useMarketData } from './MarketDataWrapper';
import { useMappingEngine } from '../../audio/MappingEngine';
import { getMappings } from '../../audio/MappingStore';
import type { StoredMapping } from '../../audio/types';
import { MoreHorizontal } from 'lucide-react';
import { useAmbiencePlayer } from '../../audio/useAmbiencePlayer';

export const Dashboard: React.FC = () => {
  const { raw, sentiment } = useMarketData();

  // ── Sound mapping state ──────────────────────────────────────────────────────
  const [modalIndicator, setModalIndicator] = useState<string | null>(null);
  const [mappings, setMappings] = useState<StoredMapping[]>(() => getMappings());

  const refresh = useCallback(() => setMappings(getMappings()), []);

  const handleOpenMapping = useCallback((indicatorName: string) => {
    setModalIndicator(indicatorName);
  }, []);

  // Run the mapping engine (evaluates conditions on every market tick)
  useMappingEngine();

  // ── Office ambience ───────────────────────────────────────────────────────────
  const { enabled: ambienceEnabled, toggle: toggleAmbience } = useAmbiencePlayer();

  // ── Dashboard data ────────────────────────────────────────────────────────────
  const oi          = raw.openInterest as any;
  const priceStruct = raw.priceStructure as any;
  const vwap        = raw.vwap as any;
  const btcCorr     = raw.btcCorrelation as any;
  const buyWall     = Math.max(0, Math.min(100, 50 + ((raw.bidAskImbalance as any)?.value ?? 0) * 50));
  const sellWall    = 100 - buyWall;

  const hasFooter = mappings.length > 0;

  return (
    <div className={`min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 ${hasFooter ? 'pb-24' : ''}`}>
      {/* Section 1: Header */}
      <Header
        onOpenMapping={handleOpenMapping}
        ambienceEnabled={ambienceEnabled}
        onAmbienceToggle={toggleAmbience}
      />

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* Section 2 + 3: Hero Orb + Indicator Row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section 2: Hero Orb */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden min-h-[420px]">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Market Engine Active</span>
            </div>
            <div className="absolute top-6 right-6 flex items-center gap-1">
              <button
                onClick={() => handleOpenMapping('currentPrice')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                title="Add sound mapping for Price"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <HeroOrb />
          </div>

          {/* Section 3: Indicator Row + Section 4: Cumulative Delta */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Section 3 */}
            <div className="relative bg-white/5 border border-white/10 rounded-2xl pt-6">
              <div className="px-6 pb-2">
                <h3 className="text-white font-bold text-base">Indicator Row</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">
                  Hover a tile and click ⋯ to add a sound mapping
                </p>
              </div>
              <IndicatorRow onOpenMapping={handleOpenMapping} />
            </div>

            {/* Section 4: Cumulative Delta */}
            <div className="flex-1 min-h-[260px] relative group">
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenMapping('cumulativeDelta')}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                  title="Add sound mapping for Cumulative Delta"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <CumulativeDelta />
            </div>
          </div>
        </section>

        {/* Section 5 + 6 + 7 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto lg:h-[620px]">
          <div className="lg:col-span-1 h-[620px] lg:h-full min-h-0">
            <TapeFeed />
          </div>
          <div className="md:col-span-1 lg:col-span-1 h-[620px] lg:h-full min-h-0">
            <PaperTrading />
          </div>
          <div className="md:col-span-2 lg:col-span-1 h-[620px] lg:h-full min-h-0 relative group">
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenMapping('sentiment')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                title="Add sound mapping for Tape Pressure / Sentiment"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <LiquidationFeed />
          </div>
        </section>

        {/* Intelligence panel */}
        <section className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-8 right-8">
            <button
              onClick={() => handleOpenMapping('volatility')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-blue-400"
              title="Add sound mapping for Volatility"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-3xl">
            <h3 className="text-white font-bold text-2xl mb-2">Terminal Intelligence</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              {priceStruct?.trend ? `Price structure: ${priceStruct.trend}. ` : ''}
              {vwap?.signal     ? `VWAP signal: ${vwap.signal}. ` : ''}
              {btcCorr?.signal  ? `BTC correlation: ${btcCorr.signal} (${btcCorr.correlation?.toFixed(3)}). ` : ''}
              {oi?.signal       ? `Open interest: ${oi.signal} (${oi.openInterest?.toFixed(0)} ETH).` : 'Analysing live market structure…'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Buy Wall Strength</span>
                  <span className="text-emerald-400 font-mono">{buyWall.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${buyWall}%` }} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Sell Wall Pressure</span>
                  <span className="text-rose-400 font-mono">{sellWall.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${sellWall}%` }} />
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
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest opacity-40">Cryptonic © 2026</span>
          <div className="flex items-center gap-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Risk Disclosure</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Portals: modal + footer */}
      {ReactDOM.createPortal(
        <>
          {modalIndicator && (
            <SoundMappingModal
              indicatorName={modalIndicator}
              isOpen={true}
              onClose={() => setModalIndicator(null)}
              onSaved={() => { refresh(); setModalIndicator(null); }}
            />
          )}
          <SoundFooter mappings={mappings} onRefresh={refresh} />
        </>,
        document.body,
      )}
    </div>
  );
};
