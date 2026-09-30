'use client';
/**
 * AssemblyInteraction.tsx — INTERACTIVE drag-to-assemble for ORIGEN.
 *
 * The user CONSTRUCTS the ORIGEN symbol by dragging the three real stone
 * pieces (TIERRA / TIEMPO / MANO) to their target positions. This is NOT an
 * automatic animation — the 3D justifies itself through interactivity.
 *
 * Mechanics:
 *   1. Pieces start scattered (offset from their identity/target positions).
 *   2. The user can orbit/zoom to inspect.
 *   3. Pointer/touch down on a piece → selects it, disables orbit, starts drag.
 *   4. Drag moves the piece on a camera-facing plane.
 *   5. Release → if within SNAP_THRESHOLD of target, snap-smooth to target.
 *   6. When all 3 are snapped → ORIGEN complete → reveal landing.
 *
 * Visual feedback:
 *   - Hover: emissive lift.
 *   - Proximity: subtle glow when near target.
 *   - Snap: smooth lerp to target + small material shift.
 *   - Complete: camera + lighting change.
 *
 * The geometry is NEVER modified. Only the groups' positions are animated.
 * The target = (0,0,0) for each group (identity = the original GLB state).
 */
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useMaterialStore, syncMaterialState } from '@/3d/materialViewer';
import type { PartName } from '@/3d/masterSymbol';

const SCATTER_OFFSETS: Record<PartName, [number, number, number]> = {
  TIERRA: [-1.4, -0.2, 0.3],
  TIEMPO: [1.4, -0.2, 0.3],
  MANO: [0, 1.3, -0.3],
};

const SNAP_THRESHOLD = 0.35; // world units — generous, satisfying
const SNAP_SPEED = 6.0;      // lerp speed for snap animation

interface PartState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  placed: boolean;
  hovering: boolean;
}

export function AssemblyInteraction({
  parts,
  meshes,
}: {
  parts: Record<PartName, THREE.Object3D | null>;
  meshes: THREE.Mesh[];
}) {
  const { camera, gl, raycaster, pointer } = useThree();
  const setAssembled = useMaterialStore((s) => s.setAssembled);
  const setAssemblyPhase = useMaterialStore((s) => s.setAssemblyPhase);
  const assemblyPhase = useMaterialStore((s) => s.assemblyPhase);

  // Per-part runtime state.
  const partStates = useRef<Record<PartName, PartState>>({
    TIERRA: { position: new THREE.Vector3(...SCATTER_OFFSETS.TIERRA), target: new THREE.Vector3(0, 0, 0), placed: false, hovering: false },
    TIEMPO: { position: new THREE.Vector3(...SCATTER_OFFSETS.TIEMPO), target: new THREE.Vector3(0, 0, 0), placed: false, hovering: false },
    MANO: { position: new THREE.Vector3(...SCATTER_OFFSETS.MANO), target: new THREE.Vector3(0, 0, 0), placed: false, hovering: false },
  });

  // Drag state.
  const dragPart = useRef<PartName | null>(null);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const dragIntersection = useRef(new THREE.Vector3());

  // Scatter the parts on mount.
  useEffect(() => {
    for (const name of ['TIERRA', 'TIEMPO', 'MANO'] as PartName[]) {
      const obj = parts[name];
      if (!obj) continue;
      const st = partStates.current[name];
      obj.position.copy(st.position);
      st.placed = false;
    }
    setAssembled(false);
    setAssemblyPhase('scattered');
  }, [parts, setAssembled, setAssemblyPhase]);

  // Disable auto-rotate during the assembly (the user needs a stable view to drag).
  // (The OrbitControls autoRotate is controlled by the store's autoRotate flag,
  // but we override it locally during assembly.)
  const autoRotateStore = useMaterialStore((s) => s.autoRotate);

  // Listen for drag-start events dispatched by the primitive's onPointerDown.
  useEffect(() => {
    const onDragStart = (e: Event) => {
      const { name } = (e as CustomEvent).detail;
      const obj = parts[name as PartName];
      if (!obj) return;
      const st = partStates.current[name as PartName];
      if (st.placed) return;

      dragPart.current = name as PartName;
      setAssemblyPhase('dragging');

      // Compute drag plane: camera-facing, through the part's current position.
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), obj.position);

      // Record the offset between the pointer intersection and the part.
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
        dragOffset.current.copy(dragIntersection.current).sub(obj.position);
      }
    };
    window.addEventListener('origen-drag-start', onDragStart as EventListener);
    return () => window.removeEventListener('origen-drag-start', onDragStart as EventListener);
  }, [parts, camera, raycaster, pointer, setAssemblyPhase]);

  // Pointer move (while dragging) → move the part.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragPart.current) return;
      const obj = parts[dragPart.current];
      if (!obj) return;

      // Recompute pointer NDC from the event.
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y } as any, camera);

      if (raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
        const newPos = dragIntersection.current.clone().sub(dragOffset.current);
        const st = partStates.current[dragPart.current];
        st.position.copy(newPos);
        obj.position.copy(newPos);
      }
    };

    const onUp = () => {
      if (!dragPart.current) return;
      const name = dragPart.current;
      const obj = parts[name];
      const st = partStates.current[name];
      if (!obj || !st) { dragPart.current = null; return; }

      // Check snap.
      const dist = obj.position.distanceTo(st.target);
      if (dist < SNAP_THRESHOLD) {
        st.placed = true;
        // The snap animation runs in useFrame (lerp to target).
      }
      // If not snapped, leave the part where it is.

      dragPart.current = null;

      // Check if all three are placed.
      const allPlaced = (['TIERRA', 'TIEMPO', 'MANO'] as PartName[]).every(
        (n) => partStates.current[n].placed
      );
      if (allPlaced) {
        setAssemblyPhase('complete');
        setAssembled(true);
      } else {
        setAssemblyPhase('scattered');
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [parts, camera, raycaster, gl, setAssembled, setAssemblyPhase]);

  // useFrame: snap animation + proximity feedback.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    for (const name of ['TIERRA', 'TIEMPO', 'MANO'] as PartName[]) {
      const obj = parts[name];
      if (!obj) continue;
      const st = partStates.current[name];

      if (st.placed) {
        // Snap: lerp to target.
        obj.position.lerp(st.target, Math.min(dt * SNAP_SPEED, 1));
        // Lock when very close.
        if (obj.position.distanceTo(st.target) < 0.001) {
          obj.position.copy(st.target);
        }
      }

      // Proximity glow: if not placed and close to target, lift emissive.
      if (!st.placed) {
        const dist = obj.position.distanceTo(st.target);
        const proximity = Math.max(0, 1 - dist / (SNAP_THRESHOLD * 2));
        const mats = meshes.filter((m) => m.parent?.parent?.name === name || m.parent?.name === name);
        for (const m of mats) {
          const sm = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
          if (sm) {
            const lift = proximity * 0.25;
            sm.emissive = new THREE.Color(proximity > 0.3 ? '#3a2a14' : '#000000');
            sm.emissiveIntensity = lift;
          }
        }
      }
    }
  });

  return null;
}

/** Apply hover emissive lift to a part's meshes. */
export function applyHoverEmissive(meshes: THREE.Mesh[], hovering: boolean) {
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const sm = mat as THREE.MeshStandardMaterial;
      sm.emissive = hovering ? new THREE.Color('#2a1e0e') : sm.emissive;
      sm.emissiveIntensity = hovering ? 0.15 : sm.emissiveIntensity;
    }
  }
}
