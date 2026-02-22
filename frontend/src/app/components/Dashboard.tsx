import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Header } from './Header';
import { IndicatorRow } from './IndicatorRow';
import { CumulativeDelta } from './CumulativeDelta';
import { TapeFeed } from './TapeFeed';
import { LiquidationFeed } from './LiquidationFeed';
import { PaperTrading } from './PaperTrading';
import { SoundMappingModal } from './sound/SoundMappingModal';
import { SoundFooter } from './sound/SoundFooter';
import { useMappingEngine } from '../../audio/MappingEngine';
import { getMappings } from '../../audio/MappingStore';
import type { StoredMapping } from '../../audio/types';
import { MoreHorizontal } from 'lucide-react';
import { useAmbiencePlayer } from '../../audio/useAmbiencePlayer';

export const Dashboard: React.FC = () => {
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

        {/* Section 2 + 3: Tape Feed + Indicator Row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[640px] gap-6">
          {/* Section 2: Tape Feed */}
          <div className="lg:col-span-4">
            <TapeFeed />
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

            {/* Section 4: Cumulative Delta + Liquidation Feed */}
            <div className="grid grid-cols-2 gap-6 flex-1 min-h-[260px]">
              <div className="relative group h-full">
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
              <div className="relative group h-full min-h-0">
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenMapping('sentiment')}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                    title="Add sound mapping for Liquidations"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <LiquidationFeed />
              </div>
            </div>
          </div>
        </section>

        {/* Paper Trading */}
        <section className="h-[600px]">
          <PaperTrading />
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
