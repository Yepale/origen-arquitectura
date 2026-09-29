/**
 * cameraRig.tsx
 *
 * Camera + framing + orbit controls for the ORIGEN viewer.
 * Declarative framing from composition dimensions; OrbitControls for user
 * interaction. Supports an external "reset view" signal: when the counter
 * increments, the camera returns to its default framed position.
 *
 * No direct mutation of the R3F camera outside of effect-driven resets, so
 * the react-hooks/immutability rule stays satisfied.
 */
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';

export interface CameraRigProps {
  compositionHeight: number;
  compositionWidth: number;
  autoRotate: boolean;
  autoRotateSpeed?: number;
  /** Increment to reset the camera to its default framed pose. */
  resetViewSignal: number;
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

export function CameraRig({
  compositionHeight,
  compositionWidth,
  autoRotate,
  autoRotateSpeed = 0.6,
  resetViewSignal,
}: CameraRigProps) {
  const targetY = compositionHeight * 0.52;
  const controlsRef = useRef<any>(null);

  const pos = useMemo<[number, number, number]>(
    () => defaultPosition(compositionHeight, compositionWidth, targetY),
    [compositionHeight, compositionWidth, targetY]
  );

  // Reset the orbit controls to the default pose whenever the signal changes.
  // Damping is briefly disabled so the reset snaps instantly (otherwise a
  // damped ease would take many frames and look stuck in throttled contexts).
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
