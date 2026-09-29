'use client';
/**
 * OrigenComposition.tsx — the assembled 3D scene contents.
 *
 * Runtime flow (per ORIGEN production contract):
 *   ORIGEN_MASTER.glb → ORIGEN_SYMBOL (found by name) → measure bbox
 *   → pedestal as spatial reference → place symbol on pedestal top → render.
 *
 * The ORIGEN mesh is NEVER split, repositioned internally, or procedurally
 * rebuilt. Only material parameters (wireframe / roughness / vertex colors /
 * env intensity) are synced for inspection, and the LOD GLB URL may be
 * swapped for performance.
 */
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { useOrigenSymbol } from '@/3d/masterSymbol';
import { usePedestal } from '@/3d/pedestal';
import { applyHoverState, useInteraction } from '@/3d/interaction';
import { syncMaterialState, useMaterialStore } from '@/3d/materialViewer';

export interface CompositionInfo {
  symbolHeight: number;
  compositionHeight: number;
  compositionWidth: number;
  pedestalTopY: number;
}

export function OrigenComposition({
  onLoaded,
}: {
  onLoaded?: (info: CompositionInfo) => void;
}) {
  const lod = useMaterialStore((s) => s.lod);
  const wireframe = useMaterialStore((s) => s.wireframe);
  const roughnessOverride = useMaterialStore((s) => s.roughnessOverride);
  const vertexColors = useMaterialStore((s) => s.vertexColors);
  const envIntensity = useMaterialStore((s) => s.envIntensity);

  const { symbol, size, meshes } = useOrigenSymbol(lod);
  const { pedestal, topY } = usePedestal();
  const inter = useInteraction();

  // Place pedestal at origin (base already on Y=0), symbol on top.
  const symbolWorldY = topY;

  // Report composition dimensions to parent (for camera framing).
  useEffect(() => {
    onLoaded?.({
      symbolHeight: size.y,
      compositionHeight: topY + size.y,
      compositionWidth: Math.max(size.x, 2.1),
      pedestalTopY: topY,
    });
  }, [size.y, size.x, topY, onLoaded]);

  // Sync material state every frame (cheap; guards against LOD swaps).
  useFrame(() => {
    applyHoverState(meshes, inter.hovered);
    syncMaterialState(meshes, {
      wireframe,
      roughnessOverride,
      vertexColors,
      envIntensity,
      // remaining fields unused by syncMaterialState:
      lod, season: 'summer', autoRotate: true, showBackdrop: true,
      setWireframe: () => {}, setRoughness: () => {}, setVertexColors: () => {},
      setEnvIntensity: () => {}, setLod: () => {}, setSeason: () => {},
      setAutoRotate: () => {}, setShowBackdrop: () => {}, reset: () => {},
    } as any);
  });

  return (
    <group>
      {/* Soft contact shadow just under the pedestal base */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[2.4, 64]} />
        <shadowMaterial opacity={0.32} />
      </mesh>
      {/* Pedestal — spatial reference only, never merged with ORIGEN */}
      <primitive object={pedestal} position={[0, 0, 0]} castShadow receiveShadow />
      {/* ORIGEN master symbol — immutable, rests on pedestal */}
      <group
        position={[0, symbolWorldY, 0]}
        onPointerOver={inter.onPointerOver}
        onPointerOut={inter.onPointerOut}
        onClick={inter.onClick}
      >
        <primitive object={symbol} castShadow receiveShadow />
      </group>
    </group>
  );
}
