'use client';
/**
 * OrigenViewer.tsx — R3F Canvas wrapper for the ORIGEN master symbol.
 *
 * Hosts: scene manager (lights + env + fog), camera rig, the assembled
 * composition (pedestal + symbol), and a transparent canvas so the CSS
 * panoramic backdrop shows through. Fog blends the monolith base into the
 * panorama haze.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useCallback } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SceneManager, type Season } from '@/3d/sceneManager';
import { CameraRig } from '@/3d/cameraRig';
import { OrigenComposition, type CompositionInfo } from './OrigenComposition';
import { useMaterialStore } from '@/3d/materialViewer';
import { OrigenLoader } from './OrigenLoader';

export function OrigenViewer() {
  const season = useMaterialStore((s) => s.season);
  const autoRotate = useMaterialStore((s) => s.autoRotate);
  const showBackdrop = useMaterialStore((s) => s.showBackdrop);
  const [info, setInfo] = useState<CompositionInfo | null>(null);
  const onLoaded = useCallback((i: CompositionInfo) => setInfo(i), []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [5, 3.5, 7] }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={<OrigenLoader />}>
        <SceneManager season={season as Season} />
        {info && (
          <CameraRig
            compositionHeight={info.compositionHeight}
            compositionWidth={info.compositionWidth}
            autoRotate={autoRotate}
          />
        )}
        <OrigenComposition onLoaded={onLoaded} />
      </Suspense>
      {/* Disable built-in default controls — CameraRig provides its own */}
      <OrbitControls makeDefault={false} enabled={false} />
    </Canvas>
  );
}
