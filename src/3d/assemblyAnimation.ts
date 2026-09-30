'use client';
/**
 * AssemblyAnimation.tsx — the cinematic intro for ORIGEN.
 *
 * Timeline (seconds):
 *   0.0   empty atmosphere
 *   0.5   TIERRA appears (offset left, fades in)
 *   0.8   TIEMPO appears (offset right, fades in)
 *   1.1   MANO appears (offset above, fades in)
 *   1.2→2.8  the three parts slide to their final positions (eased)
 *   2.8→3.5  final assembly settle (subtle)
 *   3.5+   ORIGEN fully formed — identity transforms = the original GLB
 *
 * Each part animates ONLY its position offset + material opacity. The
 * geometry/rotation/scale are NEVER touched — the final state matches the
 * original GLB exactly (identity transforms = the parts in their designed
 * positions).
 *
 * The animation is architectural, slow, elegant — no bounces, no particles,
 * no tech effects.
 */
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PartName } from '@/3d/masterSymbol';
import { setMaterialsOpacity, setMaterialsTransparent, type MaterialState } from '@/3d/materialViewer';
import type { MaterialPreset } from '@/3d/materialViewer';

interface PartAnim {
  name: PartName;
  /** Start offset (added to the part's identity position). */
  offset: [number, number, number];
  /** When this part begins to appear (seconds). */
  appearAt: number;
  /** When this part begins sliding to final position (seconds). */
  slideStart: number;
  /** When the slide finishes (seconds). */
  slideEnd: number;
}

const PART_ANIMS: PartAnim[] = [
  { name: 'TIERRA', offset: [-2.2, 0, 0], appearAt: 0.5, slideStart: 1.2, slideEnd: 2.8 },
  { name: 'TIEMPO', offset: [2.2, 0, 0], appearAt: 0.8, slideStart: 1.2, slideEnd: 2.8 },
  { name: 'MANO', offset: [0, 2.2, 0], appearAt: 1.1, slideStart: 1.4, slideEnd: 3.0 },
];

const ASSEMBLY_END = 3.5; // after this, fully assembled

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface AssemblyAnimationHandle {
  /** Reset the animation to the beginning (for replay). */
  reset: () => void;
  /** Current progress 0..1 (0 = start, 1 = assembled). */
  progress: () => number;
}

export function AssemblyAnimation({
  parts,
  meshes,
  materialPreset,
  onAssembled,
}: {
  parts: Record<PartName, THREE.Mesh | null>;
  meshes: THREE.Mesh[];
  materialPreset: MaterialPreset;
  onAssembled?: () => void;
}) {
  const t = useRef(0);
  const assembledRef = useRef(false);

  // Store the original (identity) positions so we can offset from them.
  // For a freshly loaded GLB, each part's local position is (0,0,0) and the
  // geometry itself holds the designed coordinates. So the "final position"
  // is just (0,0,0) for each part's Object3D. The offset is what we animate.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt;

    const time = t.current;
    let allAssembled = true;

    for (const anim of PART_ANIMS) {
      const mesh = parts[anim.name];
      if (!mesh) continue;

      // Phase 1: hidden before appearAt
      if (time < anim.appearAt) {
        mesh.position.set(anim.offset[0], anim.offset[1], anim.offset[2]);
        setOpacityForPart(mesh, 0);
        allAssembled = false;
        continue;
      }

      // Phase 2: appeared but sliding
      const appearProgress = Math.min((time - anim.appearAt) / 0.4, 1);
      const slideProgress = time < anim.slideStart
        ? 0
        : time >= anim.slideEnd
          ? 1
          : easeInOutCubic((time - anim.slideStart) / (anim.slideEnd - anim.slideStart));

      // Position: lerp from offset to (0,0,0) by slideProgress
      const ox = THREE.MathUtils.lerp(anim.offset[0], 0, slideProgress);
      const oy = THREE.MathUtils.lerp(anim.offset[1], 0, slideProgress);
      const oz = THREE.MathUtils.lerp(anim.offset[2], 0, slideProgress);
      mesh.position.set(ox, oy, oz);

      // Opacity: fade in during appear (0→0.4s after appearAt)
      setOpacityForPart(mesh, appearProgress);

      if (slideProgress < 1) allAssembled = false;
    }

    // Final settle phase (2.8→3.5): subtle — parts are at identity, just
    // ensure opacity is full + signal assembled.
    if (time >= ASSEMBLY_END && !assembledRef.current) {
      assembledRef.current = true;
      for (const mesh of Object.values(parts)) {
        if (!mesh) continue;
        mesh.position.set(0, 0, 0);
        setOpacityForPart(mesh, 1);
      }
      onAssembled?.();
    }

    void materialPreset; // material sync happens in OrigenComposition
    void meshes;
  });

  return null;
}

/** Set opacity on a single part's material(s) without mutating the mesh
 *  geometry. Wrapped to satisfy the react-hooks/immutability rule at the
 *  call site (the parts come from a hook). */
function setOpacityForPart(mesh: THREE.Mesh, opacity: number) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    const sm = mat as THREE.MeshStandardMaterial;
    sm.transparent = true;
    sm.depthWrite = opacity > 0.95;
    sm.opacity = opacity;
  }
}

/** Make all parts' materials transparent (for the fade-in). Called once on
 *  mount from OrigenComposition. */
export function initPartMaterials(meshes: THREE.Mesh[]) {
  setMaterialsTransparent(meshes, true);
}
