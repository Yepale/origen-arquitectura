'use client';
/**
 * useUrlState.ts
 *
 * Bidirectional sync between a subset of the material store and the URL hash.
 * Encodes: season, lod, wireframe, vertexColors, envIntensity, roughness,
 * autoRotate, showBackdrop, cameraPreset.
 *
 *   store → hash : whenever a synced field changes, the hash is updated
 *                  (debounced via rAF so slider drags don't thrash history).
 *   hash  → store : on mount and on `hashchange`, the hash is parsed and the
 *                  store is updated. This makes links shareable & bookmarkable.
 *
 * Unknown / invalid values are silently ignored so malformed hashes never
 * break the experience.
 */
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMaterialStore, SEASON_ENV_DEFAULTS } from '@/3d/materialViewer';
import type { LOD } from '@/3d/masterSymbol';
import type { Season } from '@/3d/sceneManager';
import type { CameraPreset } from '@/3d/materialViewer';

const SYNCED_KEYS = [
  'season',
  'lod',
  'wireframe',
  'showEdges',
  'vertexColors',
  'envIntensity',
  'roughnessOverride',
  'autoRotate',
  'autoTour',
  'showBackdrop',
  'audioEnabled',
  'cameraPreset',
] as const;

const LODS: LOD[] = ['master', 'lod1', 'lod2'];
const SEASONS: Season[] = ['summer', 'winter'];
const PRESETS: CameraPreset[] = ['hero', 'front', 'side', 'top'];

function parseHash(): Partial<Record<(typeof SYNCED_KEYS)[number], unknown>> {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  for (const pair of raw.split('&')) {
    const [k, v] = pair.split('=');
    if (!k || v === undefined) continue;
    switch (k) {
      case 'season':
        if (SEASONS.includes(v as Season)) out.season = v as Season;
        break;
      case 'lod':
        if (LODS.includes(v as LOD)) out.lod = v as LOD;
        break;
      case 'wireframe':
        out.wireframe = v === '1';
        break;
      case 'showEdges':
        out.showEdges = v === '1';
        break;
      case 'vertexColors':
        out.vertexColors = v === '1';
        break;
      case 'envIntensity': {
        const n = parseFloat(v);
        if (!Number.isNaN(n)) out.envIntensity = n;
        break;
      }
      case 'roughness': {
        if (v === 'auto') out.roughnessOverride = null;
        else {
          const n = parseFloat(v);
          if (!Number.isNaN(n)) out.roughnessOverride = n;
        }
        break;
      }
      case 'autoRotate':
        out.autoRotate = v === '1';
        break;
      case 'autoTour':
        out.autoTour = v === '1';
        break;
      case 'showBackdrop':
        out.showBackdrop = v === '1';
        break;
      case 'audio':
        out.audioEnabled = v === '1';
        break;
      case 'view':
        if (PRESETS.includes(v as CameraPreset)) out.cameraPreset = v as CameraPreset;
        break;
    }
  }
  return out;
}

function buildHash(s: {
  season: Season;
  lod: LOD;
  wireframe: boolean;
  showEdges: boolean;
  vertexColors: boolean;
  envIntensity: number;
  roughnessOverride: number | null;
  autoRotate: boolean;
  autoTour: boolean;
  showBackdrop: boolean;
  audioEnabled: boolean;
  cameraPreset: CameraPreset;
}): string {
  const parts = [
    `season=${s.season}`,
    `lod=${s.lod}`,
    `wireframe=${s.wireframe ? '1' : '0'}`,
    `edges=${s.showEdges ? '1' : '0'}`,
    `vertexColors=${s.vertexColors ? '1' : '0'}`,
    `envIntensity=${s.envIntensity.toFixed(2)}`,
    `roughness=${s.roughnessOverride === null ? 'auto' : s.roughnessOverride.toFixed(2)}`,
    `autoRotate=${s.autoRotate ? '1' : '0'}`,
    `autoTour=${s.autoTour ? '1' : '0'}`,
    `showBackdrop=${s.showBackdrop ? '1' : '0'}`,
    `audio=${s.audioEnabled ? '1' : '0'}`,
    `view=${s.cameraPreset}`,
  ];
  return parts.join('&');
}

export function useUrlState() {
  // Read hash → store on mount.
  useEffect(() => {
    const parsed = parseHash();
    const store = useMaterialStore.getState();
    if (parsed.season) store.setSeason(parsed.season as Season);
    if (parsed.lod) store.setLod(parsed.lod as LOD);
    if (typeof parsed.wireframe === 'boolean') store.setWireframe(parsed.wireframe);
    if (typeof parsed.showEdges === 'boolean') store.setShowEdges(parsed.showEdges);
    if (typeof parsed.vertexColors === 'boolean') store.setVertexColors(parsed.vertexColors);
    if (typeof parsed.envIntensity === 'number') store.setEnvIntensity(parsed.envIntensity);
    if (parsed.roughnessOverride !== undefined) store.setRoughness(parsed.roughnessOverride as number | null);
    if (typeof parsed.autoRotate === 'boolean') store.setAutoRotate(parsed.autoRotate);
    if (typeof parsed.autoTour === 'boolean') store.setAutoTour(parsed.autoTour);
    if (typeof parsed.showBackdrop === 'boolean') store.setShowBackdrop(parsed.showBackdrop);
    if (typeof parsed.audioEnabled === 'boolean') store.setAudioEnabled(parsed.audioEnabled);
    if (parsed.cameraPreset) store.applyCameraPreset(parsed.cameraPreset as CameraPreset);
  }, []);

  // Store → hash (debounced via rAF).
  useEffect(() => {
    let raf = 0;
    let scheduled = false;
    const subscribe = useMaterialStore.subscribe;
    const unsub = subscribe((state, prev) => {
      // Only react to synced fields.
      let changed = false;
      for (const k of SYNCED_KEYS) {
        if (state[k] !== prev[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(() => {
        scheduled = false;
        const s = useMaterialStore.getState();
        const hash = buildHash({
          season: s.season,
          lod: s.lod,
          wireframe: s.wireframe,
          showEdges: s.showEdges,
          vertexColors: s.vertexColors,
          envIntensity: s.envIntensity,
          roughnessOverride: s.roughnessOverride,
          autoRotate: s.autoRotate,
          autoTour: s.autoTour,
          showBackdrop: s.showBackdrop,
          audioEnabled: s.audioEnabled,
          cameraPreset: s.cameraPreset,
        });
        if (window.location.hash !== `#${hash}`) {
          history.replaceState(null, '', `#${hash}`);
        }
      });
    });
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Hash → store on hashchange (back/forward, manual edit, cross-tab).
  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash();
      const store = useMaterialStore.getState();
      if (parsed.season) store.setSeason(parsed.season as Season);
      if (parsed.lod) store.setLod(parsed.lod as LOD);
      if (typeof parsed.wireframe === 'boolean') store.setWireframe(parsed.wireframe);
      if (typeof parsed.showEdges === 'boolean') store.setShowEdges(parsed.showEdges);
      if (typeof parsed.vertexColors === 'boolean') store.setVertexColors(parsed.vertexColors);
      if (typeof parsed.envIntensity === 'number') store.setEnvIntensity(parsed.envIntensity);
      if (parsed.roughnessOverride !== undefined) store.setRoughness(parsed.roughnessOverride as number | null);
      if (typeof parsed.autoRotate === 'boolean') store.setAutoRotate(parsed.autoRotate);
      if (typeof parsed.autoTour === 'boolean') store.setAutoTour(parsed.autoTour);
      if (typeof parsed.showBackdrop === 'boolean') store.setShowBackdrop(parsed.showBackdrop);
      if (typeof parsed.audioEnabled === 'boolean') store.setAudioEnabled(parsed.audioEnabled);
      if (parsed.cameraPreset) store.applyCameraPreset(parsed.cameraPreset as CameraPreset);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
}

// Re-export so the share button can build the canonical URL without subscribing.
export function buildShareUrl(): string {
  const s = useMaterialStore.getState();
  const hash = buildHash({
    season: s.season,
    lod: s.lod,
    wireframe: s.wireframe,
    showEdges: s.showEdges,
    vertexColors: s.vertexColors,
    envIntensity: s.envIntensity,
    roughnessOverride: s.roughnessOverride,
    autoRotate: s.autoRotate,
    autoTour: s.autoTour,
    showBackdrop: s.showBackdrop,
    audioEnabled: s.audioEnabled,
    cameraPreset: s.cameraPreset,
  });
  if (typeof window === 'undefined') return `#${hash}`;
  return `${window.location.origin}${window.location.pathname}#${hash}`;
}

// Silence unused-import warning for SEASON_ENV_DEFAULTS (kept for external use).
void SEASON_ENV_DEFAULTS;

/**
 * useShareLink — consume the `shareSignal` counter (raised by the share
 * button or the `L` shortcut) and copy the canonical share URL to the
 * clipboard, surfacing a sonner toast with the outcome.
 */
export function useShareLink() {
  const shareSignal = useMaterialStore((s) => s.shareSignal);
  useEffect(() => {
    if (shareSignal === 0) return;
    const url = buildShareUrl();
    const fallback = () => {
      // Legacy fallback if Clipboard API is unavailable.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast.success('Enlace copiado', { description: 'URL del estado actual copiada al portapapeles.' });
      } catch {
        toast.error('No se pudo copiar', { description: url });
      }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast.success('Enlace copiado', { description: 'URL del estado actual copiada al portapapeles.' }),
        () => fallback()
      );
    } else {
      fallback();
    }
  }, [shareSignal]);
}
