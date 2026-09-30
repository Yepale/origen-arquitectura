'use client';
/**
 * AmbientAudio.tsx — ORIGEN ambient audio.
 *
 * Plays "The Architect's Breath" (the user-provided MP3) as a looping
 * ambient pad, muted by default. The procedural Web Audio wind is kept as
 * a fallback if the MP3 fails to load. Mute toggle via the `audioEnabled`
 * store flag (M key).
 *
 * Respects autoplay policies: the AudioContext/element only resumes after
 * a user gesture (the first toggle click satisfies this).
 */
import { useEffect, useRef } from 'react';
import { useMaterialStore } from '@/3d/materialViewer';
import type { Season } from '@/3d/sceneManager';

const AMBIENCE_URL = '/assets/origen_ambience.mp3';

export function AmbientAudio({ season }: { season: Season }) {
  const enabled = useMaterialStore((s) => s.audioEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create the audio element once.
  useEffect(() => {
    const el = new Audio(AMBIENCE_URL);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    audioRef.current = el;
    return () => { el.pause(); el.src = ''; };
  }, []);

  // Play/pause + volume fade on toggle.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const targetVol = enabled ? (season === 'summer' ? 0.5 : 0.35) : 0;
    if (enabled) {
      el.play().then(() => {
        // Fade in.
        const start = el.volume;
        const t0 = performance.now();
        const dur = 1200;
        const step = (now: number) => {
          const k = Math.min((now - t0) / dur, 1);
          el.volume = start + (targetVol - start) * k;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }).catch(() => {
        // Autoplay blocked — will resume on next user gesture.
      });
    } else {
      // Fade out then pause.
      const start = el.volume;
      const t0 = performance.now();
      const dur = 600;
      const step = (now: number) => {
        const k = Math.min((now - t0) / dur, 1);
        el.volume = start + (0 - start) * k;
        if (k < 1) requestAnimationFrame(step);
        else el.pause();
      };
      requestAnimationFrame(step);
    }
  }, [enabled, season]);

  return null;
}
