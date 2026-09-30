/**
 * masterSymbol.ts — runtime loader + grouping for ORIGEN_MASTER.glb.
 *
 * The GLB contains 3 real stone meshes (the user's cleaned model):
 *
 *   tripo_part_1 → TIERRA  (left,  98,980 verts)
 *   tripo_part_2 → MANO    (center, 34,102 verts)
 *   tripo_part_5 → TIEMPO  (right, 108,627 verts)
 *
 * At runtime we:
 *   1. Load the GLB as-is (NO regeneration, NO geometry modification).
 *   2. Find the 3 meshes by name.
 *   3. Create 3 Groups (TIERRA, MANO, TIEMPO).
 *   4. Reparent each mesh into its Group preserving the FULL world matrix
 *      (position + quaternion + scale) — NOT just position subtraction.
 *   5. Record each Group's target = its original world position.
 *   6. Assign independent stone materials per group.
 *   7. Tag with userData.piece for raycast resolution.
 *
 * The geometry is NEVER touched. Normals are conserved as-is.
 */
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { modelUrl, MODEL_LIBRARY, type ModelId } from './models';

export const ORIGEN_MASTER_URL = '/assets/models/ORIGEN_MASTER.glb';
export const ORIGEN_MASTER_LOD1_URL = '/assets/models/ORIGEN_MASTER_LOD1.glb';
export const ORIGEN_MASTER_LOD2_URL = '/assets/models/ORIGEN_MASTER_LOD2.glb';

export type LOD = 'master' | 'lod1' | 'lod2';

export type PartName = 'TIERRA' | 'TIEMPO' | 'MANO';

/** Mesh name → part mapping. */
const MESH_TO_PART: Record<string, PartName> = {
  tripo_part_1: 'TIERRA',
  tripo_part_2: 'MANO',
  tripo_part_5: 'TIEMPO',
};

/** Stone material colors — subtle variation, same family (pale limestone). */
const PART_COLORS: Record<PartName, string> = {
  TIERRA: '#C4A882',
  MANO:   '#C9B89A',
  TIEMPO: '#BEB0A0',
};

export interface ModelData {
  root: THREE.Group;
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  meshes: THREE.Mesh[];
  parts: Record<PartName, THREE.Group | null>;
  targets: Record<PartName, THREE.Vector3>;
}

function createPartMaterial(part: PartName): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(PART_COLORS[part]),
    roughness: 0.80,
    metalness: 0.0,
    side: THREE.FrontSide,
    envMapIntensity: 1.0,
  });
}

export function useOrigenSymbol(id: ModelId = 'origen', lod: LOD = 'master'): ModelData {
  const entry = MODEL_LIBRARY[id];
  const url = modelUrl(id, lod);
  const { scene } = useGLTF(url);

  return useMemo(() => {
    const glbRoot = entry.rootName ? (scene.getObjectByName(entry.rootName) ?? scene) : scene;

    // Force the scene to update world matrices BEFORE reparenting.
    scene.updateMatrixWorld(true);

    const root = new THREE.Group();
    root.name = 'ORIGEN_ROOT';

    const parts: Record<PartName, THREE.Group | null> = {
      TIERRA: null, TIEMPO: null, MANO: null,
    };
    const targets: Record<PartName, THREE.Vector3> = {
      TIERRA: new THREE.Vector3(), TIEMPO: new THREE.Vector3(), MANO: new THREE.Vector3(),
    };
    const meshes: THREE.Mesh[] = [];

    // Find the 3 meshes by their original names.
    for (const [meshName, partName] of Object.entries(MESH_TO_PART)) {
      const pn = partName as PartName;
      const mesh = glbRoot.getObjectByName(meshName) as THREE.Mesh | null;
      if (!mesh) continue;

      // Decompose the mesh's FULL world matrix → position + quaternion + scale.
      const worldMatrix = mesh.matrixWorld.clone();
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      worldMatrix.decompose(worldPos, worldQuat, worldScale);

      // Create the Group AT the mesh's original world transform.
      const group = new THREE.Group();
      group.name = pn;
      group.userData.piece = pn;
      group.position.copy(worldPos);
      group.quaternion.copy(worldQuat);
      group.scale.copy(worldScale);

      // Record the target = the group's original world position.
      targets[pn] = worldPos.clone();

      // Reparent the mesh into the group. Set the mesh's local transform to
      // identity because the group now holds the world transform.
      if (mesh.parent) mesh.parent.remove(mesh);
      mesh.position.set(0, 0, 0);
      mesh.quaternion.identity();
      mesh.scale.set(1, 1, 1);
      mesh.userData.piece = pn;
      group.add(mesh);
      root.add(group);

      parts[pn] = group;
      meshes.push(mesh);
    }

    // Assign independent stone materials per group.
    for (const [partName, group] of Object.entries(parts)) {
      if (!group) continue;
      const mat = createPartMaterial(partName as PartName);
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = mat;
      });
    }

    // Hide any extra meshes not in the 3-part mapping.
    glbRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const name = (o as THREE.Mesh).name || '';
        if (!MESH_TO_PART[name]) (o as THREE.Mesh).visible = false;
      }
    });

    const bbox = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    return { root, bbox, size, center, meshes, parts, targets };
  }, [scene, entry]);
}

export type OrigenSymbolData = ModelData;

[ORIGEN_MASTER_URL, ORIGEN_MASTER_LOD1_URL, ORIGEN_MASTER_LOD2_URL].forEach((u) =>
  useGLTF.preload(u)
);
