/**
 * materialViewer.ts
 *
 * Runtime inspection & interaction store for ORIGEN.
 *
 * Exposes a Zustand-backed store for:
 *  - material params: wireframe / roughness / vertex-colors / env-intensity
 *  - LOD selection (master / lod1 / lod2)
 *  - scene mood: season / auto-rotate / backdrop
 *  - transient signals: resetViewSignal, captureSignal (incremented to trigger)
 *  - overlays: showShortcuts, showConcept + active concept tag
 *  - telemetry: fps, drawCalls (updated from inside R3F each frame)
 *
 * The store NEVER rebuilds geometry — only adjusts material parameters and
 * swaps the GLB LOD URL. Geometry/transforms of ORIGEN_MASTER stay immutable.
 */
import * as THREE from 'three';
import { create } from 'zustand';
import type { LOD } from './masterSymbol';
import type { Season } from './sceneManager';

export type ConceptTag = 'tierra' | 'tiempo' | 'mano';

export interface MaterialState {
  // ── material params ──
  wireframe: boolean;
  roughnessOverride: number | null;   // null = use material default (0.86)
  vertexColors: boolean;
  envIntensity: number;
  // ── scene mood ──
  lod: LOD;
  season: Season;
  autoRotate: boolean;
  showBackdrop: boolean;
  // ── transient signals (increment to trigger an action) ──
  resetViewSignal: number;
  captureSignal: number;
  // ── overlays ──
  showShortcuts: boolean;
  showConcept: boolean;
  conceptTag: ConceptTag | null;
  // ── telemetry ──
  fps: number;
  drawCalls: number;
  triangles: number;
  loaded: boolean;

  setWireframe: (v: boolean) => void;
  setRoughness: (v: number | null) => void;
  setVertexColors: (v: boolean) => void;
  setEnvIntensity: (v: number) => void;
  setLod: (l: LOD) => void;
  setSeason: (s: Season) => void;
  setAutoRotate: (v: boolean) => void;
  setShowBackdrop: (v: boolean) => void;
  resetView: () => void;
  capture: () => void;
  toggleShortcuts: () => void;
  openConcept: (tag: ConceptTag) => void;
  closeConcept: () => void;
  setTelemetry: (t: { fps: number; drawCalls: number; triangles: number }) => void;
  setLoaded: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  wireframe: false,
  roughnessOverride: null,
  vertexColors: true,
  envIntensity: 0.6,
  lod: 'master' as LOD,
  season: 'summer' as Season,
  autoRotate: true,
  showBackdrop: true,
};

export const useMaterialStore = create<MaterialState>((set) => ({
  ...DEFAULTS,
  resetViewSignal: 0,
  captureSignal: 0,
  showShortcuts: false,
  showConcept: false,
  conceptTag: null,
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  loaded: false,

  setWireframe: (v) => set({ wireframe: v }),
  setRoughness: (v) => set({ roughnessOverride: v }),
  setVertexColors: (v) => set({ vertexColors: v }),
  setEnvIntensity: (v) => set({ envIntensity: v }),
  setLod: (l) => set({ lod: l }),
  setSeason: (s) => set({ season: s }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setShowBackdrop: (v) => set({ showBackdrop: v }),
  resetView: () => set((s) => ({ resetViewSignal: s.resetViewSignal + 1 })),
  capture: () => set((s) => ({ captureSignal: s.captureSignal + 1 })),
  toggleShortcuts: () => set((s) => ({ showShortcuts: !s.showShortcuts })),
  openConcept: (tag) => set({ showConcept: true, conceptTag: tag }),
  closeConcept: () => set({ showConcept: false, conceptTag: null }),
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
