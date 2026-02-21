import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'cryptonic_ambience_enabled';
const AMBIENCE_SRC = '/sounds/office_ambience.mp3';

export function useAmbiencePlayer() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const hasInteracted = useRef(false);

  // Create the audio element once on mount
  useEffect(() => {
    const audio = new Audio(AMBIENCE_SRC);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Browsers block autoplay before a user gesture — resume on first interaction
    const handleInteraction = () => {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        if (enabledRef.current) {
          audio.play().catch(() => {});
        }
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      audio.pause();
      audio.src = '';
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Play/pause when enabled changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (enabled) {
      if (hasInteracted.current) {
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }

    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, [enabled]);

  const toggle = () => setEnabled(prev => !prev);

  return { enabled, toggle };
}
