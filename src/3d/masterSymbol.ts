/**
 * masterSymbol.ts — loads the 3-part ORIGEN_MASTER.glb.
 *
 * FINAL-PHASE structure:
 *   ORIGEN_MASTER (scene)
 *     └─ ORIGEN_SYMBOL (group)
 *          ├─ TIERRA  (left pillar — earth volume)
 *          ├─ TIEMPO  (right pillar — time volume)
 *          └─ MANO   (central lintel/keystone — hand volume, arched underside)
 *
 * The three parts are exposed separately so the intro assembly animation
 * can move each one independently, then settle them into the final ORIGEN.
 * The final state (identity transforms) = the complete ORIGEN emblem.
 *
 * No pedestal. The symbol stands autonomously on Y=0.
 *
 * Runtime contract: load GLB → resolve ORIGEN_SYMBOL → find the three named
 * meshes → measure bbox → never split/rebuild geometry. The GLB is immutable.
 */
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { modelUrl, MODEL_LIBRARY, type ModelId } from './models';

export const ORIGEN_MASTER_URL = '/assets/models/ORIGEN_MASTER.glb';
export const ORIGEN_MASTER_LOD1_URL = '/assets/models/ORIGEN_MASTER_LOD1.glb';
export const ORIGEN_MASTER_LOD2_URL = '/assets/models/ORIGEN_MASTER_LOD2.glb';

export type LOD = 'master' | 'lod1' | 'lod2';

/** @deprecated use modelUrl(id, lod) from models.ts. */
export function lodUrl(lod: LOD): string {
  return modelUrl('origen', lod);
}

export type PartName = 'TIERRA' | 'TIEMPO' | 'MANO';

export interface ModelData {
  /** The ORIGEN_SYMBOL group (root of the sculpture). */
  root: THREE.Object3D;
  /** Local-space bounding box (base at Y=0, centered on XZ). */
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  /** All meshes inside the root (for material sync / edges overlay). */
  meshes: THREE.Mesh[];
  /** The three named parts — TIERRA / TIEMPO / MANO — for the interactive
   *  assembly. Each is a Group (or Mesh) whose local transform is identity
   *  (the final assembled position). The interaction scatters them; snapping
   *  returns them to identity = the original GLB. */
  parts: Record<PartName, THREE.Object3D | null>;
}

/**
 * Load ORIGEN_MASTER.glb and resolve the three named parts.
 * Never splits / reinterprets / procedurally rebuilds geometry.
 */
export function useOrigenSymbol(id: ModelId = 'origen', lod: LOD = 'master'): ModelData {
  const entry = MODEL_LIBRARY[id];
  const url = modelUrl(id, lod);
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const root = entry.rootName ? (scene.getObjectByName(entry.rootName) ?? scene) : scene;
    const bbox = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    // Resolve the three named parts for the assembly animation.
    const parts: Record<PartName, THREE.Object3D | null> = {
      TIERRA: root.getObjectByName('TIERRA') as THREE.Object3D | null,
      TIEMPO: root.getObjectByName('TIEMPO') as THREE.Object3D | null,
      MANO: root.getObjectByName('MANO') as THREE.Object3D | null,
    };
    // Tag each part group with userData.piece for raycast resolution.
    for (const [name, obj] of Object.entries(parts)) {
      if (obj) obj.userData.piece = name;
    }
    return { root, bbox, size, center, meshes, parts };
  }, [scene, entry]);
}

// Backward-compat alias.
export type OrigenSymbolData = ModelData;

// Preload all ORIGEN LODs + the rocky-Y model.
[ORIGEN_MASTER_URL, ORIGEN_MASTER_LOD1_URL, ORIGEN_MASTER_LOD2_URL].forEach((u) =>
  useGLTF.preload(u)
);
useGLTF.preload('/assets/models/rocky-Y.glb');
