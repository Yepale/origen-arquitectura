/**
 * pedestal.ts
 *
 * Loads pedestal.glb — a spatial reference only.
 * The pedestal is NEVER merged into the ORIGEN mesh.
 *
 * Runtime places pedestal at world origin (base on Y=0) and rests the
 * ORIGEN symbol on top of it (symbol local base Y=0 → pedestal top).
 */
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

export const PEDESTAL_URL = '/assets/models/pedestal.glb';

export interface PedestalData {
  pedestal: THREE.Object3D;
  bbox: THREE.Box3;
  size: THREE.Vector3;
  /** World-space Y of the pedestal's top surface (where the symbol rests). */
  topY: number;
  /** World-space Y of the pedestal's base (always 0). */
  baseY: number;
}

export function usePedestal(): PedestalData {
  const { scene } = useGLTF(PEDESTAL_URL);
  return useMemo(() => {
    const pedestal = scene.getObjectByName('Pedestal') ?? scene;
    const bbox = new THREE.Box3().setFromObject(pedestal);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    return {
      pedestal,
      bbox,
      size,
      baseY: 0,
      topY: bbox.max.y,   // pedestal geometry already has base at Y=0
    };
  }, [scene]);
}

useGLTF.preload(PEDESTAL_URL);
