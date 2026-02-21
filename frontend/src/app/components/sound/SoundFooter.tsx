import React from 'react';
import { Play, Pause, Volume2, Trash2, Music, Activity } from 'lucide-react';
import { audioEngine } from '../../../audio/AudioEngine';
import { updateMapping, removeMapping } from '../../../audio/MappingStore';
import type { StoredMapping } from '../../../audio/types';

interface Props {
  mappings: StoredMapping[];
  onRefresh: () => void;
}

function kindIcon(kind: StoredMapping['config']['kind']) {
  if (kind === 'event_sample') return <Volume2 className="w-3.5 h-3.5 text-blue-400" />;
  if (kind === 'level_sample') return <Music className="w-3.5 h-3.5 text-purple-400" />;
  return <Activity className="w-3.5 h-3.5 text-amber-400" />;
}

function kindTag(kind: StoredMapping['config']['kind']) {
  const map: Record<typeof kind, string> = {
    event_sample: 'ES',
    level_sample: 'LS',
    event_control: 'EC',
    level_control: 'LC',
  };
  const colors: Record<typeof kind, string> = {
    event_sample:  'bg-blue-500/20 text-blue-400',
    level_sample:  'bg-purple-500/20 text-purple-400',
    event_control: 'bg-amber-500/20 text-amber-400',
    level_control: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${colors[kind]}`}>
      {map[kind]}
    </span>
  );
}

function getSoundId(m: StoredMapping): string {
  if (m.config.kind === 'event_sample') return m.config.sound_id;
  if (m.config.kind === 'level_sample') return m.config.synth_id;
  return '';
}

function hasVolume(kind: StoredMapping['config']['kind']) {
  return kind === 'event_sample' || kind === 'level_sample';
}

export function SoundFooter({ mappings, onRefresh }: Props) {
  if (mappings.length === 0) return null;

  function togglePause(m: StoredMapping) {
    updateMapping(m.uuid, { paused: !m.paused });
    if (!m.paused) {
      // pausing — stop audio immediately
      const id = getSoundId(m);
      if (m.config.kind === 'level_sample') audioEngine.stopHarp(id);
    }
    onRefresh();
  }

  function handleVolume(m: StoredMapping, vol: number) {
    updateMapping(m.uuid, { volume: vol });
    const id = getSoundId(m);
    if (m.config.kind === 'event_sample') audioEngine.setVolume(id, vol);
    if (m.config.kind === 'level_sample') audioEngine.setHarpVolume(id, vol);
    onRefresh();
  }

  function handleRemove(m: StoredMapping) {
    const id = getSoundId(m);
    if (m.config.kind === 'level_sample') audioEngine.stopHarp(id);
    removeMapping(m.uuid);
    onRefresh();
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-xl"
      style={{ maxHeight: '180px', overflowY: 'auto' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          🔊 Active Sound Mappings ({mappings.length})
        </span>
      </div>

      {/* Mapping rows */}
      <div className="divide-y divide-white/5">
        {mappings.map(m => (
          <div key={m.uuid} className="flex items-center gap-4 px-6 py-2.5 hover:bg-white/3 transition-colors group">
            {/* Kind icon + tag */}
            <div className="flex items-center gap-2 w-8">
              {kindIcon(m.config.kind)}
            </div>

            {/* Label + indicator */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold truncate">{m.config.label}</span>
                {kindTag(m.config.kind)}
              </div>
              <span className="text-white/30 text-[10px] font-mono">{m.indicatorName}</span>
            </div>

            {/* Volume slider (only for sample/harp) */}
            {hasVolume(m.config.kind) ? (
              <div className="flex items-center gap-2 w-32">
                <Volume2 className="w-3 h-3 text-white/20 flex-shrink-0" />
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={m.volume}
                  onChange={e => handleVolume(m, parseFloat(e.target.value))}
                  className="w-full h-1 accent-blue-500 cursor-pointer"
                  title={`Volume: ${Math.round(m.volume * 100)}%`}
                />
              </div>
            ) : (
              <div className="w-32 text-center">
                <span className="text-[10px] text-white/20 uppercase tracking-widest">FX only</span>
              </div>
            )}

            {/* Play / Pause */}
            <button
              onClick={() => togglePause(m)}
              title={m.paused ? 'Resume' : 'Pause'}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {m.paused
                ? <Play className="w-3.5 h-3.5 text-emerald-400" />
                : <Pause className="w-3.5 h-3.5 text-white/40" />}
            </button>

            {/* Remove */}
            <button
              onClick={() => handleRemove(m)}
              title="Remove mapping"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
