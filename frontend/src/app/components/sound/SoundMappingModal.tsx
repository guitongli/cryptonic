import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, Music, Activity, ArrowRight } from 'lucide-react';
import { getMappings, addMapping } from '../../../audio/MappingStore';
import {
  AVAILABLE_SOUNDS, INDICATOR_META,
  type StoredMapping, type MappingConfig, type Condition,
  type Scale, type ArpeggioDirection, type FXType,
} from '../../../audio/types';
import { audioEngine } from '../../../audio/AudioEngine';

// ── Step types ─────────────────────────────────────────────────────────────────

type Step =
  | 'track_type'
  | 'action_type'
  | 'event_sample'
  | 'level_sample'
  | 'event_control'
  | 'level_control';

interface Props {
  indicatorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Shared UI helpers (must live outside SoundMappingModal to keep stable refs) ─

function Input({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-colors text-white placeholder-white/20"
      />
    </div>
  );
}

function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors text-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ConditionEditor({ cond, onChange }: { cond: Condition; onChange: (c: Condition) => void }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Condition</div>
      <div className="flex gap-2">
        <select
          value={cond.op}
          onChange={e => onChange({ ...cond, op: e.target.value as Condition['op'] })}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 text-white"
        >
          <option value="crosses_above">Crosses above</option>
          <option value="crosses_below">Crosses below</option>
          <option value="above">Is above</option>
          <option value="below">Is below</option>
          <option value="equals">Equals</option>
        </select>
        <input
          type="number"
          value={cond.value}
          onChange={e => onChange({ ...cond, value: parseFloat(e.target.value) || 0 })}
          className="w-28 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500/50 text-white"
          step="0.01"
        />
      </div>
    </div>
  );
}

function RangeRow({ label, from, to, onFrom, onTo }: {
  label: string; from: number; to: number;
  onFrom: (v: number) => void; onTo: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{label}</div>
      <div className="flex gap-2 items-center">
        <input type="number" value={from} onChange={e => onFrom(parseFloat(e.target.value) || 0)}
          className="w-28 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500/50 text-white" step="0.01" />
        <span className="text-white/30 text-sm">to</span>
        <input type="number" value={to} onChange={e => onTo(parseFloat(e.target.value) || 0)}
          className="w-28 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500/50 text-white" step="0.01" />
      </div>
    </div>
  );
}

function Footer({ onBack, onSave, saveDisabled = false }: {
  onBack: () => void; onSave: () => void; saveDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <button
        onClick={onSave}
        disabled={saveDisabled}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
      >
        Save <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

const FX_OPTIONS: { value: FXType; label: string }[] = [
  { value: 'reverb', label: 'Reverb (room size)' },
  { value: 'filter', label: 'Low-pass Filter (muffle)' },
  { value: 'distortion', label: 'Distortion (drive)' },
  { value: 'tremolo', label: 'Tremolo (wobble)' },
];

// ── Sub-form defaults ──────────────────────────────────────────────────────────

const defaultCondition: Condition = { op: 'crosses_above', value: 0 };
const indicatorMeta = (name: string) =>
  INDICATOR_META[name] ?? { label: name, defaultMin: -1, defaultMax: 1 };

// ── Modal ──────────────────────────────────────────────────────────────────────

export function SoundMappingModal({ indicatorName, isOpen, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const meta = indicatorMeta(indicatorName);

  // Step history for back navigation
  const [history, setHistory] = useState<Step[]>(['track_type']);
  const step = history[history.length - 1];
  const goTo = (s: Step) => setHistory(h => [...h, s]);
  const goBack = () => setHistory(h => (h.length > 1 ? h.slice(0, -1) : h));
  const reset = () => setHistory(['track_type']);

  // Shared intermediate state
  const [isEvent, setIsEvent] = useState<boolean>(true);

  // Form fields — event_sample
  const [esLabel, setEsLabel] = useState('');
  const [esAsset, setEsAsset] = useState(AVAILABLE_SOUNDS[0].file);
  const [esCond, setEsCond] = useState<Condition>(defaultCondition);

  // Form fields — level_sample
  const [lsLabel, setLsLabel] = useState('');
  const [lsScale, setLsScale] = useState<Scale>('pentatonic_major');
  const [lsDir, setLsDir] = useState<ArpeggioDirection>('up');
  const [lsFrom, setLsFrom] = useState(meta.defaultMin);
  const [lsTo,   setLsTo]   = useState(meta.defaultMax);
  const [lsSlowBPM, setLsSlowBPM] = useState(60);
  const [lsFastBPM, setLsFastBPM] = useState(160);
  const [lsDelta,   setLsDelta]   = useState(0.01);

  // Form fields — event_control
  const [ecLabel,  setEcLabel]  = useState('');
  const [ecTarget, setEcTarget] = useState('');
  const [ecFX,     setEcFX]     = useState<FXType>('reverb');
  const [ecApply,  setEcApply]  = useState<'enter'|'exit'|'both'>('enter');
  const [ecCond,   setEcCond]   = useState<Condition>(defaultCondition);

  // Form fields — level_control
  const [lcLabel,   setLcLabel]   = useState('');
  const [lcTarget,  setLcTarget]  = useState('');
  const [lcFX,      setLcFX]      = useState<FXType>('reverb');
  const [lcFrom,    setLcFrom]    = useState(meta.defaultMin);
  const [lcTo,      setLcTo]      = useState(meta.defaultMax);
  const [lcMixFrom, setLcMixFrom] = useState(0);
  const [lcMixTo,   setLcMixTo]   = useState(1);

  // Get registered synths (for target dropdowns)
  const registeredSynths = getMappings().filter(
    m => m.config.kind === 'event_sample' || m.config.kind === 'level_sample'
  );
  const hasRegistered = registeredSynths.length > 0;

  // Sync dialog open/close
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen) { try { d.showModal(); } catch { /* ok */ } }
    else         { d.close(); reset(); }
  }, [isOpen]);

  function handleClose() { onClose(); }

  // ── Save handlers ────────────────────────────────────────────────────────────

  function getSynthId(config: MappingConfig): string {
    if (config.kind === 'event_sample') return config.sound_id;
    if (config.kind === 'level_sample') return config.synth_id;
    return '';
  }

  function saveMapping(config: MappingConfig) {
    const uuid = crypto.randomUUID();
    let finalConfig = config;
    if (config.kind === 'event_sample') {
      finalConfig = { ...config, sound_id: uuid };
    } else if (config.kind === 'level_sample') {
      finalConfig = { ...config, synth_id: uuid };
    }

    const stored: StoredMapping = {
      uuid,
      indicatorName,
      config: finalConfig,
      paused: false,
      volume: 0.8,
    };

    addMapping(stored);

    // Preload sample immediately if needed
    if (finalConfig.kind === 'event_sample') {
      void audioEngine.loadSample(uuid, `/sounds/${finalConfig.sound_asset}`);
    }

    onSaved();
    handleClose();
  }

  function saveEventSample() {
    if (!esLabel.trim()) return;
    saveMapping({
      kind: 'event_sample',
      sound_id: '', // replaced in saveMapping
      label: esLabel.trim(),
      sound_asset: esAsset,
      condition: esCond,
    });
  }

  function saveLevelSample() {
    if (!lsLabel.trim()) return;
    saveMapping({
      kind: 'level_sample',
      synth_id: '',
      label: lsLabel.trim(),
      instrument: 'harp',
      from_value: lsFrom,
      to_value: lsTo,
      arpeggio_direction: lsDir,
      tempo_mapping: { slow_bpm: lsSlowBPM, fast_bpm: lsFastBPM },
      delta_threshold: lsDelta,
      scale: lsScale,
    });
  }

  function saveEventControl() {
    if (!ecLabel.trim() || !ecTarget) return;
    saveMapping({
      kind: 'event_control',
      label: ecLabel.trim(),
      source_indicator: indicatorName,
      target_sound_id: ecTarget,
      fx: { type: ecFX },
      condition: ecCond,
      apply_on: ecApply,
    });
  }

  function saveLevelControl() {
    if (!lcLabel.trim() || !lcTarget) return;
    saveMapping({
      kind: 'level_control',
      label: lcLabel.trim(),
      source_indicator: indicatorName,
      target_synth_id: lcTarget,
      fx: { type: lcFX },
      from_value: lcFrom,
      to_value: lcTo,
      mix_from: lcMixFrom,
      mix_to: lcMixTo,
    });
  }

  // ── Step 1 choice ────────────────────────────────────────────────────────────

  function chooseTrackType(event: boolean) {
    setIsEvent(event);
    if (!event) {
      // level_sample has no action_type step needed (no FX control at level by default)
      if (!hasRegistered) { goTo('level_sample'); }
      else goTo('action_type');
    } else {
      if (!hasRegistered) { goTo('event_sample'); }
      else goTo('action_type');
    }
  }

  function chooseActionType(self: boolean) {
    if (self) {
      goTo(isEvent ? 'event_sample' : 'level_sample');
    } else {
      goTo(isEvent ? 'event_control' : 'level_control');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-0 w-full max-w-md shadow-2xl backdrop:bg-black/60"
      style={{ color: 'white' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-0.5">Sound Mapping</div>
          <div className="text-white font-bold text-sm">{meta.label}</div>
        </div>
        <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-5">

        {/* STEP 1 — Track type */}
        {step === 'track_type' && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm">What does this indicator trigger?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => chooseTrackType(true)}
                className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-xl transition-colors"
              >
                <Activity className="w-6 h-6 text-blue-400" />
                <div>
                  <div className="text-white font-bold text-sm">Event</div>
                  <div className="text-white/40 text-[10px] mt-0.5">Something specific happened</div>
                </div>
              </button>
              <button
                onClick={() => chooseTrackType(false)}
                className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-xl transition-colors"
              >
                <Music className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-white font-bold text-sm">Level</div>
                  <div className="text-white/40 text-[10px] mt-0.5">Ongoing value changes</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Action type (skipped if no registered synths) */}
        {step === 'action_type' && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm">What should happen?</p>
            <div className="space-y-3">
              <button
                onClick={() => chooseActionType(true)}
                className="w-full text-left flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl transition-colors"
              >
                <span className="text-2xl">🔊</span>
                <div>
                  <div className="text-white font-bold text-sm">Make its own sound</div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {isEvent ? 'Play a sample when condition is met' : 'Harp arpeggio follows indicator level'}
                  </div>
                </div>
              </button>
              <button
                onClick={() => chooseActionType(false)}
                className="w-full text-left flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-amber-500/50 rounded-xl transition-colors"
              >
                <span className="text-2xl">🎛</span>
                <div>
                  <div className="text-white font-bold text-sm">Modulate another sound's FX</div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {isEvent ? 'Add/remove FX on a registered sound' : 'Control FX mix level continuously'}
                  </div>
                </div>
              </button>
            </div>
            <div className="flex justify-start pt-2">
              <button onClick={goBack} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3a — Event Sample */}
        {step === 'event_sample' && (
          <div className="space-y-4">
            <div className="text-xs text-blue-400 font-bold uppercase tracking-widest">Event → Play Sample</div>
            <Input label="Label" value={esLabel} onChange={setEsLabel} placeholder="e.g. Alert Bell" />
            <Select<string>
              label="Sound"
              value={esAsset}
              onChange={setEsAsset}
              options={AVAILABLE_SOUNDS.map(s => ({ value: s.file, label: s.label }))}
            />
            <ConditionEditor cond={esCond} onChange={setEsCond} />
            <Footer onBack={goBack} onSave={saveEventSample} saveDisabled={!esLabel.trim()} />
          </div>
        )}

        {/* STEP 3b — Level Sample (harp) */}
        {step === 'level_sample' && (
          <div className="space-y-4">
            <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">Level → Harp Arpeggio</div>
            <Input label="Label" value={lsLabel} onChange={setLsLabel} placeholder="e.g. Pressure Harp" />
            <Select<Scale>
              label="Scale"
              value={lsScale}
              onChange={setLsScale}
              options={[
                { value: 'pentatonic_major', label: 'Pentatonic Major (bright)' },
                { value: 'pentatonic_minor', label: 'Pentatonic Minor (dark)' },
                { value: 'major', label: 'Major (classic)' },
                { value: 'minor', label: 'Minor (tense)' },
                { value: 'chromatic', label: 'Chromatic (all notes)' },
              ]}
            />
            <Select<ArpeggioDirection>
              label="Arpeggio Direction"
              value={lsDir}
              onChange={setLsDir}
              options={[
                { value: 'up', label: 'Up ↑' },
                { value: 'down', label: 'Down ↓' },
                { value: 'mirror', label: 'Mirror ↑↓' },
              ]}
            />
            <RangeRow
              label={`Indicator range (${meta.label})`}
              from={lsFrom} to={lsTo}
              onFrom={v => setLsFrom(v)} onTo={v => setLsTo(v)}
            />
            <RangeRow
              label="Tempo (BPM: slow → fast)"
              from={lsSlowBPM} to={lsFastBPM}
              onFrom={v => setLsSlowBPM(v)} onTo={v => setLsFastBPM(v)}
            />
            <Input label="Min delta to trigger arpeggio" value={lsDelta} onChange={v => setLsDelta(parseFloat(v)||0)} type="number" placeholder="0.01" />
            <Footer onBack={goBack} onSave={saveLevelSample} saveDisabled={!lsLabel.trim()} />
          </div>
        )}

        {/* STEP 3c — Event Control */}
        {step === 'event_control' && (
          <div className="space-y-4">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest">Event → FX Control</div>
            <Input label="Label" value={ecLabel} onChange={setEcLabel} placeholder="e.g. Reverb on Alert" />
            <Select<string>
              label="Target Sound"
              value={ecTarget}
              onChange={setEcTarget}
              options={
                registeredSynths.length === 0
                  ? [{ value: '', label: 'No registered sounds yet' }]
                  : registeredSynths.map(m => ({
                      value: m.config.kind === 'event_sample' ? m.config.sound_id : (m.config as any).synth_id,
                      label: m.config.label,
                    }))
              }
            />
            <Select<FXType> label="FX" value={ecFX} onChange={setEcFX} options={FX_OPTIONS}/>
            <Select<'enter'|'exit'|'both'>
              label="Apply when"
              value={ecApply}
              onChange={setEcApply}
              options={[
                { value: 'enter', label: 'Condition is met (enter)' },
                { value: 'exit', label: 'Condition ends (exit)' },
                { value: 'both', label: 'Both enter and exit' },
              ]}
            />
            <ConditionEditor cond={ecCond} onChange={setEcCond} />
            <Footer onBack={goBack} onSave={saveEventControl} saveDisabled={!ecLabel.trim() || !ecTarget} />
          </div>
        )}

        {/* STEP 3d — Level Control */}
        {step === 'level_control' && (
          <div className="space-y-4">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest">Level → FX Mix Control</div>
            <Input label="Label" value={lcLabel} onChange={setLcLabel} placeholder="e.g. Reverb via Delta" />
            <Select<string>
              label="Target Sound"
              value={lcTarget}
              onChange={setLcTarget}
              options={
                registeredSynths.length === 0
                  ? [{ value: '', label: 'No registered sounds yet' }]
                  : registeredSynths.map(m => ({
                      value: m.config.kind === 'event_sample' ? m.config.sound_id : (m.config as any).synth_id,
                      label: m.config.label,
                    }))
              }
            />
            <Select<FXType> label="FX" value={lcFX} onChange={setLcFX} options={FX_OPTIONS}/>
            <RangeRow
              label={`Indicator range (${meta.label})`}
              from={lcFrom} to={lcTo}
              onFrom={v => setLcFrom(v)} onTo={v => setLcTo(v)}
            />
            <RangeRow
              label="FX mix range (0=dry, 1=full wet)"
              from={lcMixFrom} to={lcMixTo}
              onFrom={v => setLcMixFrom(v)} onTo={v => setLcMixTo(v)}
            />
            <Footer onBack={goBack} onSave={saveLevelControl} saveDisabled={!lcLabel.trim() || !lcTarget} />
          </div>
        )}

      </div>
    </dialog>
  );
}
