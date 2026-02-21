import type { FXType, FXConfig, Scale, MappingConfig } from './types';

// ── Constants ──────────────────────────────────────────────────────────────────

const FX_FADE_S = 0.3;   // default FX fade duration

const SCALE_INTERVALS: Record<Scale, number[]> = {
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  major:            [0, 2, 4, 5, 7, 9, 11],
  minor:            [0, 2, 3, 5, 7, 8, 10],
  chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// ── Internal interfaces ────────────────────────────────────────────────────────

interface FXSlot {
  type: FXType;
  wetGain: GainNode;
  dryGain: GainNode;
  fxNode: AudioNode;
  // tremolo cleanup handles
  _lfoOsc?: OscillatorNode;
  _lfoConst?: ConstantSourceNode;
}

interface SampleInstance {
  buffer: AudioBuffer;
  gainNode: GainNode;          // master volume
  fxSlots: FXSlot[];
  fxChainHead: AudioNode;      // gainNode output goes here → through chain → destination
  sourceNode: AudioBufferSourceNode | null;
}

interface HarpInstance {
  config: Extract<MappingConfig, { kind: 'level_sample' }>;
  gainNode: GainNode;
  oscillator: OscillatorNode;
  scaleNotes: number[];   // sorted hz frequencies for pitch snapping
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function buildScaleNotes(scale: Scale, rootMidi = 60, octaves = 3): number[] {
  const intervals = SCALE_INTERVALS[scale];
  const notes: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const iv of intervals) {
      notes.push(midiToHz(rootMidi + oct * 12 + iv));
    }
  }
  return notes;
}

function buildImpulseResponse(ctx: AudioContext, duration = 2, decay = 2): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function makeDistortionCurve(drive: number): Float32Array {
  const n = 256;
  const curve = new Float32Array(n);
  const k = drive * 200;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ── AudioEngine class ──────────────────────────────────────────────────────────

class AudioEngine {
  private ctx: AudioContext | null = null;
  private samples = new Map<string, SampleInstance>();
  private harps   = new Map<string, HarpInstance>();
  private impulse: AudioBuffer | null = null;

  // ── AudioContext (lazy, autoplay-safe) ──────────────────────────────────────

  getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // ── Sample loading ──────────────────────────────────────────────────────────

  async loadSample(soundId: string, filePath: string): Promise<void> {
    try {
      const ctx = this.getCtx();
      const response = await fetch(filePath);
      if (!response.ok) return; // file not placed yet — fail silently
      const ab = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(ab);

      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      this.samples.set(soundId, {
        buffer,
        gainNode,
        fxSlots: [],
        fxChainHead: gainNode,
        sourceNode: null,
      });
    } catch {
      // file not available yet — fail silently
    }
  }

  isSampleLoaded(soundId: string): boolean {
    return this.samples.has(soundId);
  }

  // ── Sample playback ─────────────────────────────────────────────────────────

  playSample(soundId: string, volume = 0.8): void {
    const inst = this.samples.get(soundId);
    if (!inst) return;
    const ctx = this.getCtx();

    // Disconnect old source if any
    if (inst.sourceNode) {
      try { inst.sourceNode.disconnect(); } catch { /* already disconnected */ }
    }

    inst.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);

    const source = ctx.createBufferSource();
    source.buffer = inst.buffer;
    source.connect(this.fxChainInput(inst));
    source.start();
    inst.sourceNode = source;
  }

  setVolume(soundId: string, vol: number): void {
    const inst = this.samples.get(soundId);
    if (!inst) return;
    const ctx = this.getCtx();
    inst.gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.01);
  }

  // ── FX management ──────────────────────────────────────────────────────────

  private fxChainInput(inst: SampleInstance): AudioNode {
    // The source connects to the head of the FX chain, which then routes to gainNode
    // Since gainNode is the final destination and fxChainHead is built reverse,
    // we keep fxChainHead as gainNode by default and insert FX before it.
    return inst.fxChainHead;
  }

  applyFX(soundId: string, fx: FXConfig, wetMix = 0.6): void {
    const inst = this.samples.get(soundId);
    if (!inst) return;
    const ctx = this.getCtx();

    // Don't double-apply the same FX type
    if (inst.fxSlots.some(s => s.type === fx.type)) return;

    const slot = this.buildFXSlot(ctx, fx);

    // Insert slot between the current chain head and destination:
    // Before: fxChainHead → ... → gainNode → destination
    // After:  dryGain → gainNode;  fxNode → wetGain → gainNode
    const preFX = inst.fxChainHead;
    preFX.disconnect();

    // dry path
    slot.dryGain.gain.setValueAtTime(1 - wetMix, ctx.currentTime);
    slot.wetGain.gain.setValueAtTime(wetMix, ctx.currentTime);

    preFX.connect(slot.dryGain);
    preFX.connect(slot.fxNode as AudioNode);
    (slot.fxNode as AudioNode).connect(slot.wetGain);
    slot.dryGain.connect(inst.gainNode);
    slot.wetGain.connect(inst.gainNode);

    inst.fxSlots.push(slot);
    // fxChainHead stays as preFX (gain node before FX)
  }

  updateFXMix(soundId: string, fxType: FXType, wetMix: number): void {
    const inst = this.samples.get(soundId);
    if (!inst) return;
    const ctx = this.getCtx();
    const slot = inst.fxSlots.find(s => s.type === fxType);
    if (!slot) return;
    const now = ctx.currentTime;
    slot.wetGain.gain.setValueAtTime(slot.wetGain.gain.value, now);
    slot.wetGain.gain.linearRampToValueAtTime(wetMix, now + 0.05);
    slot.dryGain.gain.setValueAtTime(slot.dryGain.gain.value, now);
    slot.dryGain.gain.linearRampToValueAtTime(1 - wetMix, now + 0.05);
  }

  removeFX(soundId: string, fxType: FXType, fadeDuration = FX_FADE_S): void {
    const inst = this.samples.get(soundId);
    if (!inst) return;
    const ctx = this.getCtx();
    const slotIdx = inst.fxSlots.findIndex(s => s.type === fxType);
    if (slotIdx === -1) return;
    const slot = inst.fxSlots[slotIdx];
    const now = ctx.currentTime;

    // Fade out wet path
    slot.wetGain.gain.setValueAtTime(slot.wetGain.gain.value, now);
    slot.wetGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    // Fade in dry path
    slot.dryGain.gain.setValueAtTime(slot.dryGain.gain.value, now);
    slot.dryGain.gain.linearRampToValueAtTime(1, now + fadeDuration);

    setTimeout(() => {
      try {
        slot.fxNode.disconnect();
        slot.wetGain.disconnect();
        slot.dryGain.disconnect();
        slot._lfoOsc?.stop();
        slot._lfoOsc?.disconnect();
        slot._lfoConst?.stop();
        slot._lfoConst?.disconnect();
      } catch { /* already disconnected */ }
      inst.fxSlots.splice(slotIdx, 1);
    }, (fadeDuration * 1000) + 50);
  }

  private buildFXSlot(ctx: AudioContext, fx: FXConfig): FXSlot {
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    let fxNode: AudioNode;
    let _lfoOsc: OscillatorNode | undefined;
    let _lfoConst: ConstantSourceNode | undefined;

    switch (fx.type) {
      case 'reverb': {
        if (!this.impulse) this.impulse = buildImpulseResponse(ctx);
        const conv = ctx.createConvolver();
        conv.buffer = this.impulse;
        fxNode = conv;
        break;
      }
      case 'filter': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;
        fxNode = filter;
        break;
      }
      case 'distortion': {
        const ws = ctx.createWaveShaper();
        ws.curve = makeDistortionCurve(0.5);
        ws.oversample = '4x';
        fxNode = ws;
        break;
      }
      case 'tremolo': {
        // tremolo: signal → tremoloGain (gain modulated by LFO offset to [0,1])
        const tremoloGain = ctx.createGain();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 5;
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.5;
        const constSrc = ctx.createConstantSource();
        constSrc.offset.value = 0.5;
        osc.connect(oscGain);
        oscGain.connect(tremoloGain.gain);
        constSrc.connect(tremoloGain.gain);
        osc.start();
        constSrc.start();
        _lfoOsc   = osc;
        _lfoConst = constSrc;
        fxNode = tremoloGain;
        break;
      }
    }

    return { type: fx.type, wetGain, dryGain, fxNode: fxNode!, _lfoOsc, _lfoConst };
  }

  // ── Pitch-to-value synthesiser ──────────────────────────────────────────────
  // Maps the indicator value directly to a scale-snapped frequency.
  // The oscillator runs continuously; updateHarpValue glides the pitch.

  startHarp(synthId: string, config: Extract<MappingConfig, { kind: 'level_sample' }>, initialValue: number): void {
    if (this.harps.has(synthId)) return;
    const ctx = this.getCtx();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
    gainNode.connect(ctx.destination);

    const scaleNotes = buildScaleNotes(config.scale, 48, 4); // C3–C7

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(this.valueToFreq(config, scaleNotes, initialValue), ctx.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();

    this.harps.set(synthId, { config, gainNode, oscillator, scaleNotes });
  }

  updateHarpValue(synthId: string, value: number): void {
    const inst = this.harps.get(synthId);
    if (!inst) return;
    const ctx = this.getCtx();
    const freq = this.valueToFreq(inst.config, inst.scaleNotes, value);
    // Smooth glide to new pitch over 100 ms
    inst.oscillator.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
  }

  stopHarp(synthId: string): void {
    const inst = this.harps.get(synthId);
    if (!inst) return;

    const ctx = this.getCtx();
    const now = ctx.currentTime;
    inst.gainNode.gain.setValueAtTime(inst.gainNode.gain.value, now);
    inst.gainNode.gain.linearRampToValueAtTime(0, now + FX_FADE_S);

    setTimeout(() => {
      try {
        inst.oscillator.stop();
        inst.oscillator.disconnect();
        inst.gainNode.disconnect();
      } catch { /* already stopped */ }
      this.harps.delete(synthId);
    }, FX_FADE_S * 1000 + 50);
  }

  setHarpVolume(synthId: string, vol: number): void {
    const inst = this.harps.get(synthId);
    if (!inst) return;
    const ctx = this.getCtx();
    inst.gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.01);
  }

  private valueToFreq(
    config: Extract<MappingConfig, { kind: 'level_sample' }>,
    scaleNotes: number[],
    value: number,
  ): number {
    const range = config.to_value - config.from_value || 1;
    const t = Math.max(0, Math.min(1, (value - config.from_value) / range));
    const idx = Math.round(t * (scaleNotes.length - 1));
    return scaleNotes[idx];
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────
// Module-level singleton avoids React Strict Mode double-creation.
export const audioEngine = new AudioEngine();
