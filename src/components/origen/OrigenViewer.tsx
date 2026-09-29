'use client';
/**
 * OrigenViewer.tsx — R3F Canvas wrapper for the ORIGEN master symbol.
 *
 * Hosts: scene manager (lights + env + fog), atmospheric particle layer
 * (dust motes in summer / snowfall in winter), camera rig (with reset-view
 * + cinematic presets + auto-tour), the assembled composition (pedestal +
 * symbol, with entrance animation + capture + telemetry + edges overlay),
 * and a transparent canvas so the CSS panoramic backdrop shows through.
 *
 * Shadow type is set to PCFShadowMap explicitly (three 0.186 removed
 * PCFSoftShadowMap, which R3F's `shadows` boolean defaults to — that
 * triggered a console warning on every mount).
 * `preserveDrawingBuffer: true` enables reliable canvas→PNG capture.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SceneManager, type Season } from '@/3d/sceneManager';
import { CameraRig } from '@/3d/cameraRig';
import { OrigenComposition, type CompositionInfo } from './OrigenComposition';
import { Atmosphere } from './Atmosphere';
import { useMaterialStore } from '@/3d/materialViewer';
import { OrigenLoader } from './OrigenLoader';
import { AmbientAudio } from './AmbientAudio';

export function OrigenViewer() {
  const season = useMaterialStore((s) => s.season);
  const autoRotate = useMaterialStore((s) => s.autoRotate);
  const autoTour = useMaterialStore((s) => s.autoTour);
  const resetViewSignal = useMaterialStore((s) => s.resetViewSignal);
  const cameraPresetSignal = useMaterialStore((s) => s.cameraPresetSignal);
  const cameraPreset = useMaterialStore((s) => s.cameraPreset);
  const [info, setInfo] = useState<CompositionInfo | null>(null);
  const onLoaded = useCallback((i: CompositionInfo) => setInfo(i), []);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [5, 3.5, 7] }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={<OrigenLoader />}>
        <SceneManager season={season as Season} />
        <Atmosphere season={season as Season} />
        {info && (
          <CameraRig
            compositionHeight={info.compositionHeight}
            compositionWidth={info.compositionWidth}
            autoRotate={autoRotate}
            autoTour={autoTour}
            resetViewSignal={resetViewSignal}
            cameraPresetSignal={cameraPresetSignal}
            cameraPreset={cameraPreset}
          />
        )}
        <OrigenComposition onLoaded={onLoaded} />
      </Suspense>
      {/* Ambient wind audio (DOM-side, not in the 3D graph). */}
      <AmbientAudio season={season as Season} />
    </Canvas>
  );
}
