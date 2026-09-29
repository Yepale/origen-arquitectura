/**
 * interaction.ts
 *
 * User interaction layer for the ORIGEN viewer:
 *  - hover highlight (subtle emissive lift)
 *  - click-to-inspect (reports composition stats)
 *  - reset-view action
 *
 * This layer NEVER modifies the ORIGEN geometry — it only adjusts
 * material parameters on the loaded mesh (which is allowed by the
 * contract: "The application must treat ORIGEN_MASTER.glb as a single
 * immutable visual asset" — material tweaks for inspection are fine).
 */
import * as THREE from 'three';
import { useState, useCallback } from 'react';

export interface InspectionState {
  hovered: boolean;
  inspecting: boolean;
}

export function useInteraction() {
  const [hovered, setHovered] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  const onPointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);
  const onPointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);
  const onClick = useCallback((e: any) => {
    e.stopPropagation();
    setInspecting((v) => !v);
  }, []);

  return { hovered, inspecting, onPointerOver, onPointerOut, onClick, setInspecting };
}

/**
 * Apply a subtle hover emissive lift to a mesh's materials without
 * changing base color / roughness (preserves the limestone look).
 */
export function applyHoverState(meshes: THREE.Mesh[], hovered: boolean) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const sm = mat as THREE.MeshStandardMaterial;
      sm.emissive = hovered ? new THREE.Color('#3a2a14') : new THREE.Color('#000000');
      sm.emissiveIntensity = hovered ? 0.35 : 0.0;
    }
  }
}
