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
 *   - autoTour: a gentle cinematic fly-through that interpolates between
 *     the presets on a timeline (6 s per pose, smooth ease in/out).
 *
 * Damping is briefly disabled during snaps so they're instant.
 */
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AUTO_TOUR_PRESETS,
  useMaterialStore,
  type CameraPreset,
} from '@/3d/materialViewer';

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
  /** Cinematic auto-tour: gentle fly-through the presets. */
  autoTour: boolean;
  /** Increment to apply `pendingOrbit` (exact-framing restore). */
  applyOrbitSignal: number;
  pendingOrbit: { azimuth: number; elevation: number; distance: number } | null;
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

// Smooth ease in/out for the auto-tour interpolation.
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

const TOUR_SEGMENT_SECONDS = 6; // time per preset in the auto-tour

export function CameraRig({
  compositionHeight,
  compositionWidth,
  autoRotate,
  autoRotateSpeed = 0.6,
  resetViewSignal,
  cameraPresetSignal,
  cameraPreset,
  autoTour,
  applyOrbitSignal,
  pendingOrbit,
}: CameraRigProps) {
  const targetY = compositionHeight * 0.52;
  const controlsRef = useRef<any>(null);
  // Auto-tour timeline accumulator (seconds, wraps around the full cycle).
  const tourT = useRef(0);

  const pos = useMemo<[number, number, number]>(
    () => defaultPosition(compositionHeight, compositionWidth, targetY),
    [compositionHeight, compositionWidth, targetY]
  );

  // Cache of preset positions for the tour (recomputed on dimension change).
  const tourPositions = useMemo(() => {
    return AUTO_TOUR_PRESETS.map((p) =>
      presetPosition(p, compositionHeight, compositionWidth, targetY)
    );
  }, [compositionHeight, compositionWidth, targetY]);

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
    tourT.current = 0;
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
    // Align the tour timeline to the chosen preset so enabling the tour later
    // continues smoothly from the current pose.
    const idx = AUTO_TOUR_PRESETS.indexOf(cameraPreset);
    if (idx >= 0) tourT.current = idx * TOUR_SEGMENT_SECONDS;
  }, [cameraPresetSignal, cameraPreset, compositionHeight, compositionWidth, targetY]);

  // Apply an exact orbit (azimuth/elevation/distance) — used by bookmark
  // restore + URL hash orbit restore. Snaps instantly (damping off).
  useEffect(() => {
    const c = controlsRef.current;
    if (!c || !pendingOrbit) return;
    const { azimuth, elevation, distance } = pendingOrbit;
    const wasDamped = c.enableDamping;
    c.enableDamping = false;
    c.target.set(0, targetY, 0);
    const x = distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = targetY + distance * Math.sin(elevation);
    const z = distance * Math.cos(elevation) * Math.cos(azimuth);
    c.object.position.set(x, y, z);
    c.object.updateProjectionMatrix?.();
    c.update();
    c.enableDamping = wasDamped;
  }, [applyOrbitSignal, pendingOrbit, targetY]);

  // Cinematic auto-tour: interpolate between preset positions on a timeline.
  useFrame((_, delta) => {
    if (!autoTour) return;
    const c = controlsRef.current;
    if (!c) return;
    const cycle = AUTO_TOUR_PRESETS.length * TOUR_SEGMENT_SECONDS;
    tourT.current = (tourT.current + Math.min(delta, 0.05)) % cycle;
    const segF = tourT.current / TOUR_SEGMENT_SECONDS;
    const segIdx = Math.floor(segF) % AUTO_TOUR_PRESETS.length;
    const nextIdx = (segIdx + 1) % AUTO_TOUR_PRESETS.length;
    const localT = smoothstep(segF - Math.floor(segF));
    const a = tourPositions[segIdx];
    const b = tourPositions[nextIdx];
    const x = THREE.MathUtils.lerp(a[0], b[0], localT);
    const y = THREE.MathUtils.lerp(a[1], b[1], localT);
    const z = THREE.MathUtils.lerp(a[2], b[2], localT);
    // Use damping for the tour so motion is buttery.
    const wasDamped = c.enableDamping;
    c.enableDamping = true;
    c.target.set(0, targetY, 0);
    c.object.position.set(x, y, z);
    c.object.updateProjectionMatrix?.();
    c.update();
    c.enableDamping = wasDamped;
    // Keep the store's `cameraPreset` in sync with the current segment so the
    // guided-tour narration card follows the camera. Only set when the segment
    // changes (avoids a set-state storm on every frame).
    const currentPreset = AUTO_TOUR_PRESETS[segIdx];
    if (currentPreset !== useMaterialStore.getState().cameraPreset) {
      useMaterialStore.setState({ cameraPreset: currentPreset });
    }
  });

  // Publish the current orbit (azimuth/elevation/distance) to a global so
  // the bookmark "save" action can snapshot the exact framing without
  // subscribing to the controls ref directly. Runs every frame (cheap).
  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    const offset = c.object.position.clone().sub(c.target);
    const distance = offset.length();
    const elevation = Math.asin(offset.y / Math.max(distance, 1e-4));
    const azimuth = Math.atan2(offset.x, offset.z);
    (globalThis as any).__origenOrbit = { azimuth, elevation, distance };
  });

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
        minDistance={2.5}
        maxDistance={8}
        minPolarAngle={THREE.MathUtils.degToRad(15)}
        maxPolarAngle={THREE.MathUtils.degToRad(85)}
        autoRotate={autoRotate && !autoTour}
        autoRotateSpeed={autoRotateSpeed}
        enablePan={false}
      />
    </>
  );
}
