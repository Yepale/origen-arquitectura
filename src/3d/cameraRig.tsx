/**
 * cameraRig.tsx
 *
 * Camera + framing + orbit controls for the ORIGEN viewer.
 * Fully declarative: the framing is computed from composition dimensions
 * and passed as props to drei's PerspectiveCamera + OrbitControls. No
 * direct mutation of the R3F camera (keeps the react-hooks/immutability
 * rule satisfied). OrbitControls takes over for user interaction.
 */
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo } from 'react';

export interface CameraRigProps {
  compositionHeight: number;
  compositionWidth: number;
  autoRotate: boolean;
  autoRotateSpeed?: number;
}

/** Comfortable camera distance to fit a target box at a given fov & aspect. */
function frameDistance(h: number, w: number, fovDeg: number, aspect: number) {
  const fov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const distH = (h / 2) / Math.tan(fov / 2);
  const distW = (w / 2) / Math.tan(hFov / 2);
  return Math.max(distH, distW) * 1.85;
}

export function CameraRig({
  compositionHeight,
  compositionWidth,
  autoRotate,
  autoRotateSpeed = 0.6,
}: CameraRigProps) {
  const targetY = compositionHeight * 0.52;

  const pos = useMemo<[number, number, number]>(() => {
    const dist = frameDistance(compositionHeight, compositionWidth, 38, 16 / 9);
    return [dist * 0.55, targetY + compositionHeight * 0.18, dist];
  }, [compositionHeight, compositionWidth, targetY]);

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
