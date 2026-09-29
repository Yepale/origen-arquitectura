/**
 * masterSymbol.ts — generic model loader.
 *
 * Runtime contract (applies to every model in the library):
 *   GLB → resolve root (named group OR whole scene) → measure bbox
 *     → never split into sub-objects → never reposition pieces
 *     → never use procedural fallback geometry
 *
 * For the ORIGEN master symbol specifically, the contract is stricter:
 *   ORIGEN_MASTER.glb → find ORIGEN_SYMBOL by name → never split into
 *     TIERRA / TIEMPO / MANO. Those are design concepts, not runtime objects.
 *
 * The GLB is the single immutable source of truth for every model.
 */
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { modelUrl, MODEL_LIBRARY, type ModelId } from './models';

export const ORIGEN_MASTER_URL = '/assets/models/ORIGEN_MASTER.glb';
export const ORIGEN_MASTER_LOD1_URL = '/assets/models/ORIGEN_MASTER_LOD1.glb';
export const ORIGEN_MASTER_LOD2_URL = '/assets/models/ORIGEN_MASTER_LOD2.glb';

export type LOD = 'master' | 'lod1' | 'lod2';

/** @deprecated use `modelUrl(id, lod)` from models.ts. Kept for backward compat. */
export function lodUrl(lod: LOD): string {
  return modelUrl('origen', lod);
}

export interface ModelData {
  /** The resolved root object (named group OR whole scene). */
  root: THREE.Object3D;
  /** Local-space bounding box (base at Y=0 for pre-centered models). */
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  /** Meshes inside the root (for material inspection / edges overlay). */
  meshes: THREE.Mesh[];
}

/**
 * Load a model from the library and resolve its root object.
 * Never splits / reinterprets / procedurally rebuilds geometry.
 *
 * @param id   model id from the library
 * @param lod  LOD selector (ignored for non-ORIGEN models — they have one LOD)
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
    return { root, bbox, size, center, meshes };
  }, [scene, entry]);
}

// Backward-compat alias.
export type OrigenSymbolData = ModelData;

// Preload all ORIGEN LODs so switching is instant.
[ORIGEN_MASTER_URL, ORIGEN_MASTER_LOD1_URL, ORIGEN_MASTER_LOD2_URL].forEach((u) =>
  useGLTF.preload(u)
);
// Preload the rocky-Y model too.
useGLTF.preload('/assets/models/rocky-Y.glb');
