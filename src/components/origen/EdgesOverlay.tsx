'use client';
/**
 * EdgesOverlay.tsx — technical-inspection overlay.
 *
 * When `showEdges` is enabled, this builds an EdgesGeometry from each loaded
 * ORIGEN + pedestal mesh and renders it as a thin amber/teal LineSegments
 * overlay. Combined with the wireframe material toggle, this gives a clean
 * technical-drawing read of the monolith's topology — useful for inspecting
 * the watertight CSG result without altering the underlying geometry.
 *
 * The overlay is purely additive (it never mutates the mesh); it receives
 * the already-loaded meshes + pedestal top Y as props from OrigenComposition
 * so it never re-loadss the GLB.
 */
import * as THREE from 'three';
import { useMemo } from 'react';
import { useMaterialStore } from '@/3d/materialViewer';

export interface EdgesOverlayProps {
  meshes: THREE.Mesh[];
  pedestalMeshes: THREE.Mesh[];
  symbolWorldY: number;
}

export function EdgesOverlay({ meshes, pedestalMeshes, symbolWorldY }: EdgesOverlayProps) {
  const showEdges = useMaterialStore((s) => s.showEdges);

  const symbolEdges = useMemo(() => {
    if (!showEdges) return [];
    return meshes.map((m) => {
      const g = m.geometry as THREE.BufferGeometry;
      return g ? new THREE.EdgesGeometry(g, 25) : null;
    }).filter(Boolean) as THREE.EdgesGeometry[];
  }, [showEdges, meshes]);

  const pedestalEdges = useMemo(() => {
    if (!showEdges) return [];
    return pedestalMeshes.map((m) => {
      const g = m.geometry as THREE.BufferGeometry;
      return g ? new THREE.EdgesGeometry(g, 25) : null;
    }).filter(Boolean) as THREE.EdgesGeometry[];
  }, [showEdges, pedestalMeshes]);

  if (!showEdges) return null;

  return (
    <group>
      {/* Pedestal edges at origin (teal) */}
      <group position={[0, 0, 0]}>
        {pedestalEdges.map((eg, i) => (
          <lineSegments key={`ped-edge-${i}`} geometry={eg}>
            <lineBasicMaterial color="#5BA3A0" transparent opacity={0.55} depthTest={false} />
          </lineSegments>
        ))}
      </group>
      {/* Symbol edges lifted to the pedestal top (amber) */}
      <group position={[0, symbolWorldY, 0]}>
        {symbolEdges.map((eg, i) => (
          <lineSegments key={`sym-edge-${i}`} geometry={eg}>
            <lineBasicMaterial color="#F5B740" transparent opacity={0.9} depthTest={false} />
          </lineSegments>
        ))}
      </group>
    </group>
  );
}
