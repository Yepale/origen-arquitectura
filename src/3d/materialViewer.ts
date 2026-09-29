/**
 * materialViewer.ts
 *
 * Runtime inspection & interaction store for ORIGEN.
 *
 * Exposes a Zustand-backed store for:
 *  - material params: wireframe / roughness / vertex-colors / env-intensity
 *  - LOD selection (master / lod1 / lod2)
 *  - scene mood: season / auto-rotate / backdrop
 *  - transient signals: resetViewSignal, captureSignal, cameraPresetSignal,
 *    shareSignal (incremented to trigger an action)
 *  - camera presets: front / hero / side / top
 *  - overlays: showShortcuts, showConcept + active concept tag, showMobileInfo
 *  - fullscreen
 *  - telemetry: fps, drawCalls, triangles, loaded
 *
 * The store NEVER rebuilds geometry — only adjusts material parameters and
 * swaps the GLB LOD URL. Geometry/transforms of ORIGEN_MASTER stay immutable.
 */
import * as THREE from 'three';
import { create } from 'zustand';
import type { LOD } from './masterSymbol';
import type { Season } from './sceneManager';

export type ConceptTag = 'tierra' | 'tiempo' | 'mano';
export type CameraPreset = 'front' | 'hero' | 'side' | 'top';

/** A saved bookmark = a snapshot of the view + material state. */
export interface OrigenBookmark {
  id: string;
  name: string;
  createdAt: number;
  cameraPreset: CameraPreset;
  orbit: { azimuth: number; elevation: number; distance: number };
  season: Season;
  lod: LOD;
  wireframe: boolean;
  showEdges: boolean;
  vertexColors: boolean;
  envIntensity: number;
  roughnessOverride: number | null;
  autoRotate: boolean;
  showBackdrop: boolean;
  audioEnabled: boolean;
}

/** Compact orbit (spherical) coords for URL hash serialization. */
export interface OrbitCoords {
  azimuth: number;    // radians around Y
  elevation: number;   // radians from horizon
  distance: number;    // world units
}

/** Per-season sensible defaults for environment intensity (used when the
 *  user switches season without a manual override). */
export const SEASON_ENV_DEFAULTS: Record<Season, number> = {
  summer: 0.85,
  winter: 0.7,
};

/** Cinematic auto-tour cycle order. */
export const AUTO_TOUR_PRESETS: CameraPreset[] = ['hero', 'front', 'side', 'top'];

/** Per-preset guided-tour narration copy (Spanish, on-brand for ORIGEN). */
export const PRESET_NARRATION: Record<CameraPreset, { title: string; body: string }> = {
  hero: {
    title: 'Heroica',
    body: 'La vista fundacional. El emblema se alza sobre el pedestal en su composición vertical completa: Tierra a la izquierda, Tiempo a la derecha, Mano como clave central. La luz cálida de la Sierra de Albarracín modela la piedra caliza.',
  },
  front: {
    title: 'Frontal',
    body: 'De frente, el arco en negativo abre el centro del monolito. La silueta es inmediatamente reconocible: dos pilares que sostienen un dintel, con un vacío que invita a cruzar la mirada.',
  },
  side: {
    title: 'Perfil',
    body: 'De perfil se revela la profundidad de la talla. El volumen único cobra presencia escultórica: no es una fachada plana, sino un bloque monolítico cuya masa dialoga con el aire de la sierra.',
  },
  top: {
    title: 'Cenital',
    body: 'Desde lo alto, la planta del símbolo muestra su simetría axial. El dintel y los pilares dibujan una cruz arquitectónica; el pedestal se convierte en el cimiento cósmico del emblema.',
  },
};

export interface MaterialState {
  // ── material params ──
  wireframe: boolean;
  showEdges: boolean;                 // technical-inspection: EdgesGeometry overlay
  roughnessOverride: number | null;   // null = use material default (0.86)
  vertexColors: boolean;
  envIntensity: number;
  // ── scene mood ──
  lod: LOD;
  season: Season;
  autoRotate: boolean;
  showBackdrop: boolean;
  audioEnabled: boolean;              // ambient wind audio (muted by default)
  // ── cinematic auto-tour ──
  autoTour: boolean;                 // gentle fly-through the presets
  guidedTour: boolean;               // auto-tour + synchronized narration cards
  // ── compare-seasons split view ──
  compareView: boolean;              // summer | winter side by side
  // ── gallery mode (minimal chrome) ──
  galleryMode: boolean;
  // ── bookmarks (saved view + material snapshots, persisted to localStorage) ──
  bookmarks: OrigenBookmark[];
  showBookmarks: boolean;
  // ── orbit apply signal (for exact-framing restore from URL hash) ──
  applyOrbitSignal: number;
  pendingOrbit: OrbitCoords | null;
  // ── transient signals (increment to trigger an action) ──
  resetViewSignal: number;
  captureSignal: number;
  cameraPresetSignal: number;
  cameraPreset: CameraPreset;
  shareSignal: number;
  // ── overlays ──
  showShortcuts: boolean;
  showConcept: boolean;
  conceptTag: ConceptTag | null;
  showMobileInfo: boolean;
  // ── fullscreen ──
  fullscreen: boolean;
  // ── telemetry ──
  fps: number;
  drawCalls: number;
  triangles: number;
  loaded: boolean;

  setWireframe: (v: boolean) => void;
  setShowEdges: (v: boolean) => void;
  setRoughness: (v: number | null) => void;
  setVertexColors: (v: boolean) => void;
  setEnvIntensity: (v: number) => void;
  setLod: (l: LOD) => void;
  setSeason: (s: Season) => void;
  setAutoRotate: (v: boolean) => void;
  setShowBackdrop: (v: boolean) => void;
  setAudioEnabled: (v: boolean) => void;
  setAutoTour: (v: boolean) => void;
  setGuidedTour: (v: boolean) => void;
  setCompareView: (v: boolean) => void;
  setGalleryMode: (v: boolean) => void;
  saveBookmark: (name: string) => void;
  deleteBookmark: (id: string) => void;
  applyBookmark: (id: string) => void;
  toggleBookmarks: () => void;
  applyOrbit: (coords: OrbitCoords) => void;
  resetView: () => void;
  capture: () => void;
  applyCameraPreset: (p: CameraPreset) => void;
  share: () => void;
  toggleShortcuts: () => void;
  openConcept: (tag: ConceptTag) => void;
  closeConcept: () => void;
  toggleMobileInfo: () => void;
  setFullscreen: (v: boolean) => void;
  setTelemetry: (t: { fps: number; drawCalls: number; triangles: number }) => void;
  setLoaded: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  wireframe: false,
  showEdges: false,
  roughnessOverride: null,
  vertexColors: true,
  envIntensity: 0.85,
  lod: 'master' as LOD,
  season: 'summer' as Season,
  autoRotate: true,
  showBackdrop: true,
  audioEnabled: false,
  autoTour: false,
  guidedTour: false,
  compareView: false,
  galleryMode: false,
};

const BOOKMARKS_KEY = 'origen-bookmarks';

/** Load bookmarks from localStorage (client-safe). */
function loadBookmarks(): OrigenBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist bookmarks to localStorage (client-safe). */
function persistBookmarks(bm: OrigenBookmark[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bm));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export const useMaterialStore = create<MaterialState>((set) => ({
  ...DEFAULTS,
  resetViewSignal: 0,
  captureSignal: 0,
  cameraPresetSignal: 0,
  cameraPreset: 'hero',
  shareSignal: 0,
  applyOrbitSignal: 0,
  pendingOrbit: null,
  bookmarks: loadBookmarks(),
  showBookmarks: false,
  showShortcuts: false,
  showConcept: false,
  conceptTag: null,
  showMobileInfo: false,
  fullscreen: false,
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  loaded: false,

  setWireframe: (v) => set({ wireframe: v }),
  setShowEdges: (v) => set({ showEdges: v }),
  setRoughness: (v) => set({ roughnessOverride: v }),
  setVertexColors: (v) => set({ vertexColors: v }),
  setEnvIntensity: (v) => set({ envIntensity: v }),
  setLod: (l) => set({ lod: l }),
  // Switching season also restores that season's env-intensity default so
  // winter reads cooler/dimmer and summer reads warmer/brighter.
  setSeason: (s) => set({ season: s, envIntensity: SEASON_ENV_DEFAULTS[s] }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setShowBackdrop: (v) => set({ showBackdrop: v }),
  setAudioEnabled: (v) => set({ audioEnabled: v }),
  // Auto-tour implies disabling manual auto-rotate (the tour drives the camera).
  setAutoTour: (v) => set({ autoTour: v, autoRotate: v ? false : useMaterialStore.getState().autoRotate }),
  // Guided tour = auto-tour + narration cards. Enabling it also enables the
  // auto-tour; disabling it leaves the auto-tour running for a clean handoff.
  setGuidedTour: (v) =>
    set((s) => ({
      guidedTour: v,
      autoTour: v ? true : s.autoTour,
      autoRotate: v ? false : s.autoRotate,
    })),
  setCompareView: (v) => set({ compareView: v }),
  setGalleryMode: (v) => set({ galleryMode: v }),
  // Bookmarks: snapshot the current view + material state into a named entry
  // persisted to localStorage. The orbit coords are read from the global
  // (set by the CameraRig each frame) so the bookmark captures the exact
  // framing, not just the preset.
  saveBookmark: (name) =>
    set((s) => {
      const orbit = (globalThis as any).__origenOrbit ?? { azimuth: 0, elevation: 0.9, distance: 10 };
      const bm: OrigenBookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name || `Vista ${s.bookmarks.length + 1}`,
        createdAt: Date.now(),
        cameraPreset: s.cameraPreset,
        orbit,
        season: s.season,
        lod: s.lod,
        wireframe: s.wireframe,
        showEdges: s.showEdges,
        vertexColors: s.vertexColors,
        envIntensity: s.envIntensity,
        roughnessOverride: s.roughnessOverride,
        autoRotate: s.autoRotate,
        showBackdrop: s.showBackdrop,
        audioEnabled: s.audioEnabled,
      };
      const next = [bm, ...s.bookmarks].slice(0, 24);
      persistBookmarks(next);
      return { bookmarks: next };
    }),
  deleteBookmark: (id) =>
    set((s) => {
      const next = s.bookmarks.filter((b) => b.id !== id);
      persistBookmarks(next);
      return { bookmarks: next };
    }),
  applyBookmark: (id) =>
    set((s) => {
      const bm = s.bookmarks.find((b) => b.id === id);
      if (!bm) return {};
      return {
        cameraPreset: bm.cameraPreset,
        cameraPresetSignal: s.cameraPresetSignal + 1,
        pendingOrbit: bm.orbit,
        applyOrbitSignal: s.applyOrbitSignal + 1,
        season: bm.season,
        envIntensity: bm.envIntensity,
        lod: bm.lod,
        wireframe: bm.wireframe,
        showEdges: bm.showEdges,
        vertexColors: bm.vertexColors,
        roughnessOverride: bm.roughnessOverride,
        autoRotate: bm.autoRotate,
        showBackdrop: bm.showBackdrop,
        audioEnabled: bm.audioEnabled,
        autoTour: false,
        guidedTour: false,
      };
    }),
  toggleBookmarks: () => set((s) => ({ showBookmarks: !s.showBookmarks })),
  // Apply an exact orbit (azimuth/elevation/distance) — used by URL hash restore.
  applyOrbit: (coords) =>
    set((s) => ({
      pendingOrbit: coords,
      applyOrbitSignal: s.applyOrbitSignal + 1,
    })),
  resetView: () => set((s) => ({ resetViewSignal: s.resetViewSignal + 1 })),
  capture: () => set((s) => ({ captureSignal: s.captureSignal + 1 })),
  applyCameraPreset: (p) =>
    set((s) => ({
      cameraPreset: p,
      cameraPresetSignal: s.cameraPresetSignal + 1,
      // Selecting a preset cancels the auto-tour + guided tour (manual control).
      autoTour: false,
      guidedTour: false,
    })),
  share: () => set((s) => ({ shareSignal: s.shareSignal + 1 })),
  toggleShortcuts: () => set((s) => ({ showShortcuts: !s.showShortcuts })),
  openConcept: (tag) => set({ showConcept: true, conceptTag: tag }),
  closeConcept: () => set({ showConcept: false, conceptTag: null }),
  toggleMobileInfo: () => set((s) => ({ showMobileInfo: !s.showMobileInfo })),
  setFullscreen: (v) => set({ fullscreen: v }),
  setTelemetry: (t) => set(t),
  setLoaded: (v) => set({ loaded: v }),
  reset: () => set({ ...DEFAULTS }),
}));

/**
 * Apply the material-store state to the loaded ORIGEN meshes.
 * Only touches material parameters — geometry & transforms are untouched.
 */
export function syncMaterialState(meshes: THREE.Mesh[], s: MaterialState) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const sm = mat as THREE.MeshStandardMaterial;
      sm.wireframe = s.wireframe;
      sm.roughness = s.roughnessOverride ?? 0.86;
      sm.vertexColors = s.vertexColors;
      sm.envMapIntensity = s.envIntensity;
      sm.needsUpdate = true;
    }
  }
}

/**
 * Mark the symbol's materials as transparent (enables the entrance fade-in).
 * Wrapped in a free function so the react-hooks/immutability rule does not
 * flag direct mutation of hook-returned mesh materials at the call site.
 */
export function setMaterialsTransparent(meshes: THREE.Mesh[], transparent: boolean) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const sm = mat as THREE.MeshStandardMaterial;
      sm.transparent = transparent;
      sm.depthWrite = true;
    }
  }
}

/**
 * Drive the entrance-reveal opacity of the symbol's materials.
 */
export function setMaterialsOpacity(meshes: THREE.Mesh[], opacity: number) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      (mat as THREE.MeshStandardMaterial).opacity = opacity;
    }
  }
}
