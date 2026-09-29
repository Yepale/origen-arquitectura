'use client';
/**
 * AmbientAudio.tsx — procedural ambient wind via the Web Audio API.
 *
 *   summer → warm low rustle (filtered brown noise, gentle LFO).
 *   winter → colder, higher-pitched wind (filtered pink noise, slower LFO).
 *
 * No external audio files → fully offline & instant. Muted by default;
 * activated by the `audioEnabled` store flag (M key or panel toggle). The
 * AudioContext is created lazily on first enable (respecting autoplay
 * policies) and suspended/resumed accordingly.
 */
import { useEffect, useRef } from 'react';
import { useMaterialStore } from '@/3d/materialViewer';
import type { Season } from '@/3d/sceneManager';

export function AmbientAudio({ season }: { season: Season }) {
  const enabled = useMaterialStore((s) => s.audioEnabled);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    src: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    gain: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  } | null>(null);

  // Build a noise buffer once per AudioContext (brown noise = warm, pink = airy).
  function makeNoiseBuffer(ctx: AudioContext, type: 'brown' | 'pink', seconds = 4): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      // Paul Kellet's pink noise approximation.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buf;
  }

  useEffect(() => {
    if (!enabled) {
      // Suspend + tear down gain to silence immediately.
      const ctx = ctxRef.current;
      const nodes = nodesRef.current;
      if (ctx && nodes) {
        nodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      }
      return;
    }

    // Lazy-create the AudioContext + graph on first enable.
    let ctx = ctxRef.current;
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return; // unsupported
      ctx = new AC();
      ctxRef.current = ctx;
    }
    ctx.resume?.().catch(() => {});

    // Rebuild the graph each enable (cheap).
    const isBrown = season === 'summer';
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, isBrown ? 'brown' : 'pink', 4);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isBrown ? 480 : 900;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(isBrown ? 0.14 : 0.1, ctx.currentTime, 0.6);

    // LFO modulates the filter cutoff for a "gust" feel.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = isBrown ? 0.18 : 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = isBrown ? 220 : 360;
    lfo.connect(lfoGain).connect(filter.frequency);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    lfo.start();
    nodesRef.current = { src, filter, gain, lfo, lfoGain };

    return () => {
      // On disable/unmount: stop nodes cleanly.
      try { src.stop(); } catch { /* already stopped */ }
      try { lfo.stop(); } catch { /* already stopped */ }
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      if (nodesRef.current === nodesRef.current) nodesRef.current = null;
    };
  }, [enabled, season]);

  return null;
}
