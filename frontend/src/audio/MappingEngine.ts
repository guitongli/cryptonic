import { useEffect, useRef } from 'react';
import { useMarketData } from '../app/components/MarketDataWrapper';
import { getMappings } from './MappingStore';
import { audioEngine } from './AudioEngine';
import type { StoredMapping, MappingConfig, Condition } from './types';

// ── Indicator value extractors ─────────────────────────────────────────────────
// Keys must match INDICATOR_META in types.ts

type Extractor = (raw: Record<string, unknown>, state: { sentiment: number; volatility: number; currentPrice: number }) => number | null;

const EXTRACTORS: Record<string, Extractor> = {
  bidAskImbalance: (raw) => (raw.bidAskImbalance as any)?.value ?? null,
  volumeIntensity:  (raw) => (raw.volumeIntensity as any)?.value ?? null,
  tradeRate:        (raw) => (raw.tradeRate as any)?.rate ?? null,
  btcCorrelation:   (raw) => (raw.btcCorrelation as any)?.correlation ?? null,
  fundingRate:      (raw) => (raw.fundingRate as any)?.rate ?? null,
  spread:           (raw) => (raw.bookTicker as any)?.spread ?? null,
  cumulativeDelta:  (raw) => (raw.cumulativeDelta as any)?.delta ?? null,
  sentiment:        (_, s) => s.sentiment,
  volatility:       (_, s) => s.volatility,
  currentPrice:     (_, s) => s.currentPrice,
};

// ── Condition evaluation ───────────────────────────────────────────────────────

function evalCondition(cond: Condition, current: number, previous: number | undefined): boolean {
  switch (cond.op) {
    case 'above':         return current > cond.value;
    case 'below':         return current < cond.value;
    case 'equals':        return Math.abs(current - cond.value) < 1e-9;
    case 'crosses_above': return previous !== undefined && previous <= cond.value && current > cond.value;
    case 'crosses_below': return previous !== undefined && previous >= cond.value && current < cond.value;
  }
}

// ── Mapping evaluation ─────────────────────────────────────────────────────────

function evaluateMapping(
  stored: StoredMapping,
  currentValues: Map<string, number>,
  prevValues: Map<string, number>,
  activeHarps: Set<string>,
  activeControls: Map<string, boolean>, // uuid → whether condition was met last tick
): void {
  const { config } = stored;

  switch (config.kind) {

    case 'event_sample': {
      const current = currentValues.get(stored.indicatorName);
      if (current === undefined) return;
      const previous = prevValues.get(stored.indicatorName);
      if (evalCondition(config.condition, current, previous)) {
        // Ensure sample is loaded (may have been added before file was placed)
        if (!audioEngine.isSampleLoaded(config.sound_id)) {
          void audioEngine.loadSample(config.sound_id, `/sounds/${config.sound_asset}`);
          return; // will play on next matching tick after load
        }
        audioEngine.playSample(config.sound_id, stored.volume);
      }
      break;
    }

    case 'level_sample': {
      const current = currentValues.get(stored.indicatorName);
      if (current === undefined) return;
      const inRange = current >= config.from_value && current <= config.to_value;
      const isActive = activeHarps.has(config.synth_id);

      if (inRange) {
        if (!isActive) {
          audioEngine.startHarp(config.synth_id, config, current);
          activeHarps.add(config.synth_id);
        } else {
          audioEngine.updateHarpValue(config.synth_id, current);
        }
      } else if (isActive) {
        audioEngine.stopHarp(config.synth_id);
        activeHarps.delete(config.synth_id);
      }
      break;
    }

    case 'event_control': {
      const current = currentValues.get(config.source_indicator);
      if (current === undefined) return;
      const previous = prevValues.get(config.source_indicator);
      const condMet = evalCondition(config.condition, current, previous);
      const wasMet = activeControls.get(stored.uuid) ?? false;

      const entering = condMet && !wasMet;
      const exiting  = !condMet && wasMet;

      activeControls.set(stored.uuid, condMet);

      const shouldApply =
        (config.apply_on === 'enter' && entering) ||
        (config.apply_on === 'exit'  && exiting)  ||
        (config.apply_on === 'both'  && (entering || exiting));

      if (!shouldApply) return;

      if (condMet || config.apply_on === 'both') {
        audioEngine.applyFX(config.target_sound_id, config.fx, 0.6);
      } else {
        audioEngine.removeFX(config.target_sound_id, config.fx.type);
      }
      break;
    }

    case 'level_control': {
      const current = currentValues.get(config.source_indicator);
      if (current === undefined) return;
      const range = config.to_value - config.from_value || 1;
      const t = Math.max(0, Math.min(1, (current - config.from_value) / range));
      const wetMix = config.mix_from + t * (config.mix_to - config.mix_from);
      // Ensure FX exists before modulating
      audioEngine.applyFX(config.target_synth_id, config.fx, wetMix);
      audioEngine.updateFXMix(config.target_synth_id, config.fx.type, wetMix);
      break;
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useMappingEngine(): void {
  const marketData = useMarketData();
  const prevValues    = useRef<Map<string, number>>(new Map());
  const activeHarps   = useRef<Set<string>>(new Set());
  const activeControls = useRef<Map<string, boolean>>(new Map());

  // Evaluate mappings on every market data update
  useEffect(() => {
    const raw = marketData.raw;
    if (Object.keys(raw).length === 0) return;

    // Compute current values for all indicators
    const currentValues = new Map<string, number>();
    for (const [key, extractor] of Object.entries(EXTRACTORS)) {
      const val = extractor(raw as Record<string, unknown>, marketData);
      if (val !== null) currentValues.set(key, val);
    }

    // Read fresh mappings from localStorage each tick
    const mappings = getMappings();

    for (const stored of mappings) {
      if (stored.paused) continue;
      evaluateMapping(stored, currentValues, prevValues.current, activeHarps.current, activeControls.current);
    }

    // Save current as previous for next tick
    for (const [key, val] of currentValues) {
      prevValues.current.set(key, val);
    }
  }, [marketData]);

  // Cleanup all harps on unmount
  useEffect(() => {
    return () => {
      for (const synthId of activeHarps.current) {
        audioEngine.stopHarp(synthId);
      }
    };
  }, []);
}
