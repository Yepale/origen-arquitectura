/**
 * masterSymbol.ts — runtime loader + grouping for ORIGEN_MASTER.glb.
 *
 * The GLB contains 3 real stone meshes (real AI-generated geometry):
 *
 *   tripo_part_1 → TIERRA  (left,  98,980 verts)
 *   tripo_part_2 → MANO    (center, 34,102 verts)
 *   tripo_part_5 → TIEMPO  (right, 108,627 verts)
 *
 * At runtime we:
 *   1. Load the GLB as-is (NO regeneration, NO geometry modification).
 *   2. Find the 3 meshes by name.
 *   3. Create 3 Groups (TIERRA, MANO, TIEMPO) and reparent each mesh.
 *   4. Record each Group's target = the mesh's original world position.
 *   5. Assign independent stone materials per group.
 *   6. Add userData.piece for raycast resolution.
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

/** @deprecated use modelUrl(id, lod) from models.ts. */
export function lodUrl(lod: LOD): string {
  return modelUrl('origen', lod);
}

export type PartName = 'TIERRA' | 'TIEMPO' | 'MANO';

/** Mesh name → part mapping (the GLB's original mesh names). */
const MESH_TO_PART: Record<string, PartName> = {
  tripo_part_1: 'TIERRA',
  tripo_part_2: 'MANO',
  tripo_part_5: 'TIEMPO',
};

/** Stone material colors — subtle variation, same family (pale limestone). */
const PART_COLORS: Record<PartName, string> = {
  TIERRA: '#C4A882',   // slightly warm
  MANO:   '#C9B89A',   // neutral limestone
  TIEMPO: '#BEB0A0',   // slightly grey
};

export interface ModelData {
  /** The ORIGEN_ROOT group containing the three part groups. */
  root: THREE.Group;
  /** Local-space bounding box (base at Y=0, centered on XZ). */
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  /** All meshes inside the root (for material sync / edges overlay). */
  meshes: THREE.Mesh[];
  /** The three named parts — each is a Group whose position is the TARGET
   *  (the original world position of its mesh). The interaction scatters
   *  them; snapping returns them to their target. */
  parts: Record<PartName, THREE.Group | null>;
  /** The target position for each part (= original world position). */
  targets: Record<PartName, THREE.Vector3>;
}

/** Create an independent stone material for a part. */
function createPartMaterial(part: PartName): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(PART_COLORS[part]),
    roughness: 0.80,
    metalness: 0.0,
    side: THREE.FrontSide,
    envMapIntensity: 1.0,
  });
}

/**
 * Load ORIGEN_MASTER.glb and resolve the three named parts at runtime.
 * NEVER regenerates or modifies the GLB geometry.
 */
export function useOrigenSymbol(id: ModelId = 'origen', lod: LOD = 'master'): ModelData {
  const entry = MODEL_LIBRARY[id];
  const url = modelUrl(id, lod);
  const { scene } = useGLTF(url);

  return useMemo(() => {
    // The GLB scene root.
    const glbRoot = entry.rootName ? (scene.getObjectByName(entry.rootName) ?? scene) : scene;

    // Find the 3 meshes by their original names.
    const meshPart1 = glbRoot.getObjectByName('tripo_part_1') as THREE.Mesh | null;
    const meshPart2 = glbRoot.getObjectByName('tripo_part_2') as THREE.Mesh | null;
    const meshPart5 = glbRoot.getObjectByName('tripo_part_5') as THREE.Mesh | null;

    // Also handle the case where the meshes are already named TIERRA/MANO/TIEMPO
    // (a pre-grouped GLB). In that case, find by part name directly.
    const directTierra = glbRoot.getObjectByName('TIERRA');
    const directMano = glbRoot.getObjectByName('MANO');
    const directTiempo = glbRoot.getObjectByName('TIEMPO');

    // Build the ORIGEN_ROOT group.
    const root = new THREE.Group();
    root.name = 'ORIGEN_ROOT';

    const parts: Record<PartName, THREE.Group | null> = {
      TIERRA: null,
      TIEMPO: null,
      MANO: null,
    };
    const targets: Record<PartName, THREE.Vector3> = {
      TIERRA: new THREE.Vector3(0, 0, 0),
      TIEMPO: new THREE.Vector3(0, 0, 0),
      MANO: new THREE.Vector3(0, 0, 0),
    };
    const meshes: THREE.Mesh[] = [];

    // If the GLB already has named groups (TIERRA/MANO/TIEMPO), use them directly.
    if (directTierra && directMano && directTiempo) {
      for (const [partName, obj] of Object.entries({ TIERRA: directTierra, MANO: directMano, TIEMPO: directTiempo })) {
        const group = obj as THREE.Group;
        group.userData.piece = partName;
        // Record the target = the group's current world position.
        const wp = new THREE.Vector3();
        group.getWorldPosition(wp);
        targets[partName as PartName] = wp.clone();
        parts[partName as PartName] = group;
        root.add(group);
        group.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            meshes.push(o as THREE.Mesh);
          }
        });
      }
    } else {
      // Runtime grouping: find the 3 meshes and wrap each in a Group.
      const meshMap: Record<PartName, THREE.Mesh | null> = {
        TIERRA: meshPart1,
        MANO: meshPart2,
        TIEMPO: meshPart5,
      };

      // Save original world matrices before reparenting.
      scene.updateMatrixWorld(true);

      for (const [partName, mesh] of Object.entries(meshMap)) {
        if (!mesh) continue;
        const pn = partName as PartName;

        // Record the mesh's original world position = the TARGET.
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        targets[pn] = worldPos.clone();

        // Create a Group for this part.
        const group = new THREE.Group();
        group.name = pn;
        group.userData.piece = pn;
        group.position.copy(worldPos); // Group at the mesh's world position.

        // Reparent the mesh into the group. Preserve the mesh's local transform
        // relative to the group by baking the world matrix into the mesh's
        // matrixLocal. Actually, simpler: keep the mesh at its local position
        // and set the group's position to the world position.
        // Detach from the original parent.
        if (mesh.parent) mesh.parent.remove(mesh);
        // The mesh's local position relative to the group = mesh's world position
        // minus the group's position = (0,0,0) since group.position = worldPos.
        mesh.position.sub(worldPos); // make the mesh local to the group
        group.add(mesh);
        root.add(group);

        parts[pn] = group;
        meshes.push(mesh);
      }
    }

    // Assign independent stone materials per group.
    for (const [partName, group] of Object.entries(parts)) {
      if (!group) continue;
      const mat = createPartMaterial(partName as PartName);
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          (o as THREE.Mesh).material = mat;
        }
      });
    }

    // Hide any meshes that are NOT one of the 3 parts (e.g. tripo_part_0, tripo_part_3).
    glbRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const meshName = (o as THREE.Mesh).name || '';
        if (!MESH_TO_PART[meshName] && meshName !== 'TIERRA' && meshName !== 'MANO' && meshName !== 'TIEMPO') {
          (o as THREE.Mesh).visible = false;
        }
      }
    });

    // Compute bounding box from the root.
    const bbox = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    return { root, bbox, size, center, meshes, parts, targets };
  }, [scene, entry]);
}

// Backward-compat alias.
export type OrigenSymbolData = ModelData;

// Preload.
[ORIGEN_MASTER_URL, ORIGEN_MASTER_LOD1_URL, ORIGEN_MASTER_LOD2_URL].forEach((u) =>
  useGLTF.preload(u)
);
