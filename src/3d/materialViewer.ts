/**
 * materialViewer.ts
 *
 * Material & runtime inspection layer. Exposes a Zustand-backed store for:
 *  - wireframe toggle
 *  - roughness override
 *  - vertex-colors toggle
 *  - LOD selection (master / lod1 / lod2)
 *  - season selection
 *  - auto-rotate
 *  - environment intensity
 *
 * The store is consumed by the page UI (a control panel) and applied to the
 * loaded ORIGEN mesh every frame. It NEVER rebuilds geometry — only adjusts
 * material parameters and swaps the GLB LOD URL.
 */
import * as THREE from 'three';
import { create } from 'zustand';
import type { LOD } from './masterSymbol';
import type { Season } from './sceneManager';

export interface MaterialState {
  wireframe: boolean;
  roughnessOverride: number | null;   // null = use material default (0.86)
  vertexColors: boolean;
  envIntensity: number;
  lod: LOD;
  season: Season;
  autoRotate: boolean;
  showBackdrop: boolean;
  setWireframe: (v: boolean) => void;
  setRoughness: (v: number | null) => void;
  setVertexColors: (v: boolean) => void;
  setEnvIntensity: (v: number) => void;
  setLod: (l: LOD) => void;
  setSeason: (s: Season) => void;
  setAutoRotate: (v: boolean) => void;
  setShowBackdrop: (v: boolean) => void;
  reset: () => void;
}

export const useMaterialStore = create<MaterialState>((set) => ({
  wireframe: false,
  roughnessOverride: null,
  vertexColors: true,
  envIntensity: 0.6,
  lod: 'master',
  season: 'summer',
  autoRotate: true,
  showBackdrop: true,
  setWireframe: (v) => set({ wireframe: v }),
  setRoughness: (v) => set({ roughnessOverride: v }),
  setVertexColors: (v) => set({ vertexColors: v }),
  setEnvIntensity: (v) => set({ envIntensity: v }),
  setLod: (l) => set({ lod: l }),
  setSeason: (s) => set({ season: s }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setShowBackdrop: (v) => set({ showBackdrop: v }),
  reset: () =>
    set({
      wireframe: false,
      roughnessOverride: null,
      vertexColors: true,
      envIntensity: 0.6,
      lod: 'master',
      season: 'summer',
      autoRotate: true,
      showBackdrop: true,
    }),
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
