/**
 * masterSymbol.ts
 *
 * Runtime loader for ORIGEN_MASTER.glb.
 *
 * STRICT RUNTIME CONTRACT (do NOT deviate):
 *   ORIGEN_MASTER.glb
 *     → find ORIGEN_SYMBOL (single group, by name)
 *     → measure bounding box
 *     → never split into TIERRA / TIEMPO / MANO
 *     → never reposition individual pieces
 *     → never use procedural fallback geometry
 *
 * The GLB is the single immutable source of truth.
 */
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

export const ORIGEN_MASTER_URL = '/assets/models/ORIGEN_MASTER.glb';
export const ORIGEN_MASTER_LOD1_URL = '/assets/models/ORIGEN_MASTER_LOD1.glb';
export const ORIGEN_MASTER_LOD2_URL = '/assets/models/ORIGEN_MASTER_LOD2.glb';

export type LOD = 'master' | 'lod1' | 'lod2';

export function lodUrl(lod: LOD): string {
  switch (lod) {
    case 'lod1':
      return ORIGEN_MASTER_LOD1_URL;
    case 'lod2':
      return ORIGEN_MASTER_LOD2_URL;
    default:
      return ORIGEN_MASTER_URL;
  }
}

export interface OrigenSymbolData {
  /** The ORIGEN_SYMBOL group (already correctly oriented & centered in its own local space). */
  symbol: THREE.Object3D;
  /** Local-space bounding box (base at Y=0, centered on XZ). */
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  /** Meshes inside the symbol (for material inspection). */
  meshes: THREE.Mesh[];
}

/**
 * Load ORIGEN_MASTER.glb and resolve the ORIGEN_SYMBOL group.
 * Never splits / reinterprets / procedurally rebuilds geometry.
 */
export function useOrigenSymbol(lod: LOD = 'master'): OrigenSymbolData {
  const { scene } = useGLTF(lodUrl(lod));
  return useMemo(() => {
    const symbol = scene.getObjectByName('ORIGEN_SYMBOL') ?? scene;
    const bbox = new THREE.Box3().setFromObject(symbol);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const meshes: THREE.Mesh[] = [];
    symbol.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    return { symbol, bbox, size, center, meshes };
  }, [scene]);
}

// Preload all LODs so switching is instant.
[ORIGEN_MASTER_URL, ORIGEN_MASTER_LOD1_URL, ORIGEN_MASTER_LOD2_URL].forEach((u) =>
  useGLTF.preload(u)
);
