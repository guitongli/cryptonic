// ── Core domain types ──────────────────────────────────────────────────────────

export type IndicatorName = string;

export type Condition = {
  op: 'crosses_above' | 'crosses_below' | 'above' | 'below' | 'equals';
  value: number;
};

export type FXType = 'reverb' | 'filter' | 'distortion' | 'tremolo';

export type FXConfig = {
  type: FXType;
  // MVP: one controlled parameter per FX type (applied at fixed value when triggered)
  // reverb     → wetMix      0.0–1.0
  // filter     → cutoffHz    200–8000
  // distortion → drive       0.0–1.0
  // tremolo    → depth       0.0–1.0
};

export type Scale =
  | 'pentatonic_major'
  | 'pentatonic_minor'
  | 'major'
  | 'minor'
  | 'chromatic';

// ── Mapping variants ───────────────────────────────────────────────────────────

export type MappingConfig =
  | {
      kind: 'event_sample';
      sound_id: string;       // unique identifier (uuid assigned on save)
      label: string;          // user-given friendly name
      sound_asset: string;    // filename, e.g. "phone_ring.mp3"
      condition: Condition;
    }
  | {
      kind: 'level_sample';
      synth_id: string;       // unique identifier
      label: string;
      instrument: 'harp';
      from_value: number;
      to_value: number;
      scale: Scale;           // pitch snapped to this scale
    }
  | {
      kind: 'event_control';
      label: string;
      source_indicator: IndicatorName;
      target_sound_id: string;  // sound_id of target event_sample or synth_id of level_sample
      fx: FXConfig;
      condition: Condition;
      apply_on: 'enter' | 'exit' | 'both';
    }
  | {
      kind: 'level_control';
      label: string;
      source_indicator: IndicatorName;
      target_synth_id: string;
      fx: FXConfig;
      from_value: number;
      to_value: number;
      mix_from: number; // 0.0
      mix_to: number;   // 1.0
    };

// ── Storage model ──────────────────────────────────────────────────────────────

export interface StoredMapping {
  uuid: string;           // generated on save via crypto.randomUUID()
  indicatorName: string;  // which indicator tile owns this mapping
  config: MappingConfig;
  paused: boolean;
  volume: number;         // 0.0–1.0; only meaningful for event_sample and level_sample
}

// ── Available sound assets ─────────────────────────────────────────────────────

export const AVAILABLE_SOUNDS = [
  { id: 'phone_ring',     label: 'Phone Ring',       file: 'phone_ring.mp3' },
  { id: 'keyboard_click', label: 'Keyboard Click',   file: 'keyboard_click.mp3' },
  { id: 'keyboard_burst', label: 'Keyboard Burst',   file: 'keyboard_burst.mp3' },
  { id: 'bell_ding',      label: 'Bell Ding',        file: 'bell_ding.mp3' },
  { id: 'cash_register',  label: 'Cash Register',    file: 'cash_register.mp3' },
  { id: 'paper_rip',      label: 'Paper Rip',        file: 'paper_rip.mp3' },
  { id: 'market_bell',    label: 'Market Bell',      file: 'market_bell.mp3' },
  { id: 'alert_beep',     label: 'Alert Beep',       file: 'alert_beep.mp3' },
] as const;

// ── Indicator metadata (matches MappingEngine extractors) ──────────────────────

export const INDICATOR_META: Record<string, { label: string; unit?: string; defaultMin: number; defaultMax: number }> = {
  bidAskImbalance: { label: 'Bid/Ask Imbalance', defaultMin: -1, defaultMax: 1 },
  volumeIntensity:  { label: 'Volume Intensity',  unit: '×', defaultMin: 0, defaultMax: 3 },
  tradeRate:        { label: 'Trade Rate',         unit: '/s', defaultMin: 0, defaultMax: 50 },
  btcCorrelation:   { label: 'BTC Correlation',    defaultMin: -1, defaultMax: 1 },
  fundingRate:      { label: 'Funding Rate',       defaultMin: -0.001, defaultMax: 0.001 },
  spread:           { label: 'Spread ($)',          unit: '$', defaultMin: 0, defaultMax: 5 },
  cumulativeDelta:  { label: 'Cumulative Delta',   defaultMin: -500, defaultMax: 500 },
  sentiment:        { label: 'Tape Pressure',       defaultMin: -1, defaultMax: 1 },
  volatility:       { label: 'Volatility',          defaultMin: 0, defaultMax: 1 },
  currentPrice:     { label: 'Price (ETH)',         defaultMin: 1000, defaultMax: 10000 },
};
