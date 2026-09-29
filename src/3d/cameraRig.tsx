/**
 * cameraRig.tsx
 *
 * Camera + framing + orbit controls for the ORIGEN viewer.
 * Declarative framing from composition dimensions; OrbitControls for user
 * interaction. Supports:
 *   - resetViewSignal: snap back to the default framed pose.
 *   - cameraPresetSignal: snap to a named cinematic pose (hero / front /
 *     side / top). The target stays on the composition center; only the
 *     azimuth / elevation / distance change.
 *
 * Damping is briefly disabled during snaps so they're instant.
 */
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import type { CameraPreset } from '@/3d/materialViewer';

export interface CameraRigProps {
  compositionHeight: number;
  compositionWidth: number;
  autoRotate: boolean;
  autoRotateSpeed?: number;
  /** Increment to reset the camera to its default framed pose. */
  resetViewSignal: number;
  /** Increment to apply `cameraPreset`. */
  cameraPresetSignal: number;
  cameraPreset: CameraPreset;
}

/** Comfortable camera distance to fit a target box at a given fov & aspect. */
function frameDistance(h: number, w: number, fovDeg: number, aspect: number) {
  const fov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const distH = (h / 2) / Math.tan(fov / 2);
  const distW = (w / 2) / Math.tan(hFov / 2);
  return Math.max(distH, distW) * 1.85;
}

function defaultPosition(h: number, w: number, targetY: number): [number, number, number] {
  const dist = frameDistance(h, w, 38, 16 / 9);
  return [dist * 0.55, targetY + h * 0.18, dist];
}

/** Compute a named cinematic camera position around the composition. */
function presetPosition(
  preset: CameraPreset,
  h: number,
  w: number,
  targetY: number
): [number, number, number] {
  const dist = frameDistance(h, w, 38, 16 / 9);
  switch (preset) {
    case 'front':
      // dead-on front, slightly lower
      return [0, targetY + h * 0.05, dist * 0.95];
    case 'side':
      // profile, eye-level with the apex
      return [dist * 0.95, targetY + h * 0.1, 0.001];
    case 'top':
      // high angle looking down
      return [0.001, targetY + dist * 1.1, 0.001];
    case 'hero':
    default:
      // classic 3-quarter hero view
      return [dist * 0.62, targetY + h * 0.22, dist * 0.78];
  }
}

export function CameraRig({
  compositionHeight,
  compositionWidth,
  autoRotate,
  autoRotateSpeed = 0.6,
  resetViewSignal,
  cameraPresetSignal,
  cameraPreset,
}: CameraRigProps) {
  const targetY = compositionHeight * 0.52;
  const controlsRef = useRef<any>(null);

  const pos = useMemo<[number, number, number]>(
    () => defaultPosition(compositionHeight, compositionWidth, targetY),
    [compositionHeight, compositionWidth, targetY]
  );

  // Reset the orbit controls to the default pose whenever the signal changes.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const wasDamped = c.enableDamping;
    c.enableDamping = false;
    c.target.set(0, targetY, 0);
    c.object.position.set(pos[0], pos[1], pos[2]);
    c.object.updateProjectionMatrix?.();
    c.update();
    c.enableDamping = wasDamped;
  }, [resetViewSignal, targetY, pos]);

  // Apply a cinematic preset whenever the preset signal changes.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const p = presetPosition(cameraPreset, compositionHeight, compositionWidth, targetY);
    const wasDamped = c.enableDamping;
    c.enableDamping = false;
    c.target.set(0, targetY, 0);
    c.object.position.set(p[0], p[1], p[2]);
    c.object.updateProjectionMatrix?.();
    c.update();
    c.enableDamping = wasDamped;
  }, [cameraPresetSignal, cameraPreset, compositionHeight, compositionWidth, targetY]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={38}
        near={0.1}
        far={100}
        position={pos}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, targetY, 0]}
        enableDamping
        dampingFactor={0.06}
        minDistance={3}
        maxDistance={16}
        minPolarAngle={THREE.MathUtils.degToRad(20)}
        maxPolarAngle={THREE.MathUtils.degToRad(82)}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enablePan
      />
    </>
  );
}
