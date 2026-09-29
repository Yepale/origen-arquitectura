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
import type { CameraPreset, MaterialPreset } from '@/3d/materialViewer';
import type { ModelId } from '@/3d/models';
import { MODEL_IDS } from '@/3d/models';

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
  'guidedTour',
  'compareView',
  'galleryMode',
  'postprocessing',
  'materialPreset',
  'kiosk',
  'modelId',
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
      case 'guided':
        out.guidedTour = v === '1';
        break;
      case 'compare':
        out.compareView = v === '1';
        break;
      case 'gallery':
        out.galleryMode = v === '1';
        break;
      case 'bloom':
        out.postprocessing = v === '1';
        break;
      case 'mat':
        out.materialPreset = v as MaterialPreset;
        break;
      case 'kiosk':
        out.kiosk = v === '1';
        break;
      case 'model':
        if (MODEL_IDS.includes(v as ModelId)) out.modelId = v as ModelId;
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
      case 'orbit': {
        // Format: azimuth,elevation,distance (radians,radians,units)
        const parts = v.split(',');
        if (parts.length === 3) {
          const az = parseFloat(parts[0]);
          const el = parseFloat(parts[1]);
          const di = parseFloat(parts[2]);
          if (!Number.isNaN(az) && !Number.isNaN(el) && !Number.isNaN(di)) {
            out.orbit = { azimuth: az, elevation: el, distance: di };
          }
        }
        break;
      }
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
  guidedTour: boolean;
  compareView: boolean;
  galleryMode: boolean;
  postprocessing: boolean;
  materialPreset: MaterialPreset;
  kiosk: boolean;
  modelId: ModelId;
  showBackdrop: boolean;
  audioEnabled: boolean;
  cameraPreset: CameraPreset;
  orbit?: { azimuth: number; elevation: number; distance: number };
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
    `guided=${s.guidedTour ? '1' : '0'}`,
    `compare=${s.compareView ? '1' : '0'}`,
    `gallery=${s.galleryMode ? '1' : '0'}`,
    `bloom=${s.postprocessing ? '1' : '0'}`,
    `mat=${s.materialPreset}`,
    `kiosk=${s.kiosk ? '1' : '0'}`,
    `model=${s.modelId}`,
    `showBackdrop=${s.showBackdrop ? '1' : '0'}`,
    `audio=${s.audioEnabled ? '1' : '0'}`,
    `view=${s.cameraPreset}`,
  ];
  if (s.orbit) {
    parts.push(`orbit=${s.orbit.azimuth.toFixed(3)},${s.orbit.elevation.toFixed(3)},${s.orbit.distance.toFixed(2)}`);
  }
  return parts.join('&');
}

/** Read the current orbit coords from the global (published by CameraRig). */
function readOrbitGlobal(): { azimuth: number; elevation: number; distance: number } | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const o = (globalThis as any).__origenOrbit;
  if (!o || typeof o.azimuth !== 'number') return undefined;
  return o;
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
    if (typeof parsed.guidedTour === 'boolean') store.setGuidedTour(parsed.guidedTour);
    if (typeof parsed.compareView === 'boolean') store.setCompareView(parsed.compareView);
    if (typeof parsed.galleryMode === 'boolean') store.setGalleryMode(parsed.galleryMode);
    if (typeof parsed.postprocessing === 'boolean') store.setPostprocessing(parsed.postprocessing);
    if (parsed.materialPreset) store.setMaterialPreset(parsed.materialPreset as MaterialPreset);
    if (typeof parsed.kiosk === 'boolean') store.setKiosk(parsed.kiosk);
    if (parsed.modelId) store.setModelId(parsed.modelId as ModelId);
    if (typeof parsed.showBackdrop === 'boolean') store.setShowBackdrop(parsed.showBackdrop);
    if (typeof parsed.audioEnabled === 'boolean') store.setAudioEnabled(parsed.audioEnabled);
    if (parsed.cameraPreset) store.applyCameraPreset(parsed.cameraPreset as CameraPreset);
    if (parsed.orbit) store.applyOrbit(parsed.orbit as { azimuth: number; elevation: number; distance: number });
    // Kiosk mode auto-starts gallery + auto-tour on load.
    if (parsed.kiosk) {
      store.setGalleryMode(true);
      store.setAutoTour(true);
    }
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
          guidedTour: s.guidedTour,
          compareView: s.compareView,
          galleryMode: s.galleryMode,
          postprocessing: s.postprocessing,
          materialPreset: s.materialPreset,
          kiosk: s.kiosk,
          modelId: s.modelId,
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
      if (typeof parsed.guidedTour === 'boolean') store.setGuidedTour(parsed.guidedTour);
      if (typeof parsed.compareView === 'boolean') store.setCompareView(parsed.compareView);
      if (typeof parsed.galleryMode === 'boolean') store.setGalleryMode(parsed.galleryMode);
      if (typeof parsed.postprocessing === 'boolean') store.setPostprocessing(parsed.postprocessing);
      if (parsed.materialPreset) store.setMaterialPreset(parsed.materialPreset as MaterialPreset);
      if (typeof parsed.kiosk === 'boolean') store.setKiosk(parsed.kiosk);
      if (parsed.modelId) store.setModelId(parsed.modelId as ModelId);
      if (typeof parsed.showBackdrop === 'boolean') store.setShowBackdrop(parsed.showBackdrop);
      if (typeof parsed.audioEnabled === 'boolean') store.setAudioEnabled(parsed.audioEnabled);
      if (parsed.cameraPreset) store.applyCameraPreset(parsed.cameraPreset as CameraPreset);
      if (parsed.orbit) store.applyOrbit(parsed.orbit as { azimuth: number; elevation: number; distance: number });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
}

// Re-export so the share button can build the canonical URL without subscribing.
// The orbit coords (exact camera framing) are read from the global published
// by the CameraRig each frame, so shared links reproduce the exact view.
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
    guidedTour: s.guidedTour,
    compareView: s.compareView,
    galleryMode: s.galleryMode,
    postprocessing: s.postprocessing,
    materialPreset: s.materialPreset,
    kiosk: s.kiosk,
    modelId: s.modelId,
    showBackdrop: s.showBackdrop,
    audioEnabled: s.audioEnabled,
    cameraPreset: s.cameraPreset,
    orbit: readOrbitGlobal(),
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
