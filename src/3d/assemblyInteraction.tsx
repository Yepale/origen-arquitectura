'use client';
/**
 * AssemblyInteraction.tsx — INTERACTIVE drag-to-assemble for ORIGEN.
 *
 * The user CONSTRUCTS the ORIGEN symbol by dragging the three real stone
 * pieces (TIERRA / TIEMPO / MANO) to their target positions. Each target
 * is RECORDED from the GLB's original mesh positions — NOT assumed to be
 * (0,0,0).
 *
 * Mechanics:
 *   1. On mount: record each part's target (original position).
 *   2. Scatter: offset each part group from its target.
 *   3. Drag: pointer/touch down → select part, move on camera plane.
 *   4. Release → if within SNAP_THRESHOLD of target, snap-smooth.
 *   5. When all 3 snapped → ORIGEN complete → reveal landing.
 *
 * ONLY the selected part's position is modified. The parent (ORIGEN_ROOT)
 * and all other parts are NEVER moved during drag.
 *
 * Raycast resolution: when the pointer hits a mesh, walk up the parent
 * chain to find the group with userData.piece set.
 */
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { useMaterialStore } from '@/3d/materialViewer';
import type { PartName } from '@/3d/masterSymbol';

const SNAP_THRESHOLD = 0.45;   // world units — generous, satisfying
const SNAP_SPEED = 8.0;        // lerp speed for snap animation

// Scatter offsets (applied RELATIVE to each part's target).
const SCATTER_OFFSETS: Record<PartName, [number, number, number]> = {
  TIERRA: [-1.6, 0.2, 0.2],
  TIEMPO: [1.6, 0.2, 0.2],
  MANO: [0, 1.4, -0.3],
};

/** Resolve which piece a hit object belongs to (walk up the parent chain). */
function resolvePiece(obj: THREE.Object3D | null): PartName | null {
  let current = obj;
  while (current) {
    const piece = current.userData?.piece;
    if (piece === 'TIERRA' || piece === 'TIEMPO' || piece === 'MANO') {
      return piece as PartName;
    }
    current = current.parent;
  }
  return null;
}

export function AssemblyInteraction({
  parts,
  targets,
  meshes,
}: {
  parts: Record<PartName, THREE.Group | null>;
  targets: Record<PartName, THREE.Vector3>;
  meshes: THREE.Mesh[];
}) {
  const { camera, gl, raycaster, pointer } = useThree();
  const setAssembled = useMaterialStore((s) => s.setAssembled);
  const setAssemblyPhase = useMaterialStore((s) => s.setAssemblyPhase);

  // Per-part runtime state.
  const partState = useRef<Record<PartName, { placed: boolean; pos: THREE.Vector3 }>>({
    TIERRA: { placed: false, pos: new THREE.Vector3() },
    TIEMPO: { placed: false, pos: new THREE.Vector3() },
    MANO: { placed: false, pos: new THREE.Vector3() },
  });

  // Drag state.
  const dragPart = useRef<PartName | null>(null);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const dragHit = useRef(new THREE.Vector3());
  const dragRay = useRef(new THREE.Raycaster());

  // Scatter on mount: offset each part from its recorded target.
  useEffect(() => {
    for (const name of ['TIERRA', 'TIEMPO', 'MANO'] as PartName[]) {
      const group = parts[name];
      if (!group) continue;
      const target = targets[name];
      const offset = SCATTER_OFFSETS[name];
      // Start position = target + scatter offset.
      const startPos = target.clone().add(new THREE.Vector3(...offset));
      group.position.copy(startPos);
      partState.current[name].pos.copy(startPos);
      partState.current[name].placed = false;
    }
    setAssembled(false);
    setAssemblyPhase('scattered');
  }, [parts, targets, setAssembled, setAssemblyPhase]);

  // Listen for drag-start events (dispatched by OrigenComposition's onPointerDown).
  useEffect(() => {
    const onDragStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const name = resolvePiece(detail.object) ?? detail.name;
      if (!name) return;
      const group = parts[name];
      if (!group) return;
      if (partState.current[name].placed) return; // locked

      dragPart.current = name;
      setAssemblyPhase('dragging');

      // Drag plane: camera-facing, through the part's current position.
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), group.position);

      // Offset between pointer hit and part position.
      dragRay.current.setFromCamera(pointer, camera);
      if (dragRay.current.ray.intersectPlane(dragPlane.current, dragHit.current)) {
        dragOffset.current.copy(dragHit.current).sub(group.position);
      }
    };
    window.addEventListener('origen-drag-start', onDragStart as EventListener);
    return () => window.removeEventListener('origen-drag-start', onDragStart as EventListener);
  }, [parts, camera, raycaster, pointer, setAssemblyPhase]);

  // Pointer move (while dragging) + pointer up (release → snap check).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragPart.current) return;
      const group = parts[dragPart.current];
      if (!group) return;

      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      dragRay.current.setFromCamera({ x, y } as any, camera);

      if (dragRay.current.ray.intersectPlane(dragPlane.current, dragHit.current)) {
        const newPos = dragHit.current.clone().sub(dragOffset.current);
        group.position.copy(newPos);
        partState.current[dragPart.current].pos.copy(newPos);
      }
    };

    const onUp = () => {
      if (!dragPart.current) return;
      const name = dragPart.current;
      const group = parts[name];
      if (!group) { dragPart.current = null; return; }

      // Check snap: distance to the part's OWN target.
      const dist = group.position.distanceTo(targets[name]);
      if (dist < SNAP_THRESHOLD) {
        partState.current[name].placed = true;
      }

      dragPart.current = null;

      // Check completion.
      const allPlaced = (['TIERRA', 'TIEMPO', 'MANO'] as PartName[]).every(
        (n) => partState.current[n].placed
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
  }, [parts, camera, gl, targets, setAssembled, setAssemblyPhase]);

  // useFrame: snap animation + proximity feedback.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (const name of ['TIERRA', 'TIEMPO', 'MANO'] as PartName[]) {
      const group = parts[name];
      if (!group) continue;
      const st = partState.current[name];
      const target = targets[name];

      if (st.placed) {
        // Snap: lerp to the part's OWN target.
        group.position.lerp(target, Math.min(dt * SNAP_SPEED, 1));
        if (group.position.distanceTo(target) < 0.001) {
          group.position.copy(target);
        }
      }

      // Proximity glow: if not placed and close to target, lift emissive.
      if (!st.placed) {
        const dist = group.position.distanceTo(target);
        const proximity = Math.max(0, 1 - dist / (SNAP_THRESHOLD * 2.5));
        group.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.emissive.setHex(proximity > 0.3 ? 0x3a2a14 : 0x000000);
            mat.emissiveIntensity = proximity * 0.3;
          }
        });
      } else {
        // Placed: clear emissive.
        group.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) { mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0; }
        });
      }
    }
  });

  return null;
}
