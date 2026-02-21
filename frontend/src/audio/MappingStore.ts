import type { StoredMapping } from './types';

// ── Versioned storage (bumping version clears stale data) ─────────────────────
const STORAGE_KEY = 'cryptonic_sound_mappings';
const VERSION = 'v1';

interface Envelope {
  version: string;
  data: StoredMapping[];
}

function readRaw(): StoredMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope.version !== VERSION) return [];
    return envelope.data;
  } catch {
    return [];
  }
}

function writeRaw(data: StoredMapping[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, data }));
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Read all stored mappings (fresh from localStorage). */
export function getMappings(): StoredMapping[] {
  return readRaw();
}

/** Get all mappings for a specific indicator. */
export function getMappingsForIndicator(indicatorName: string): StoredMapping[] {
  return readRaw().filter(m => m.indicatorName === indicatorName);
}

/** Add a new mapping. uuid must already be set on the mapping. */
export function addMapping(mapping: StoredMapping): void {
  const all = readRaw();
  all.push(mapping);
  writeRaw(all);
}

/** Update a mapping by uuid (partial update). */
export function updateMapping(uuid: string, partial: Partial<Omit<StoredMapping, 'uuid'>>): void {
  const all = readRaw();
  const idx = all.findIndex(m => m.uuid === uuid);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...partial };
  writeRaw(all);
}

/** Remove a mapping by uuid. */
export function removeMapping(uuid: string): void {
  const all = readRaw().filter(m => m.uuid !== uuid);
  writeRaw(all);
}

/** Clear all mappings. */
export function clearAll(): void {
  writeRaw([]);
}
