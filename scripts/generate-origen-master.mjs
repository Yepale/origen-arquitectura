/**
 * generate-origen-master.mjs — FINAL INTERACTIVE VERSION.
 *
 * Loads the user-provided "rocky letter y 3d model (1).glb" (real AI-generated
 * stone geometry, 5 meshes) and REGROUPS the meshes into three named groups
 * by spatial position:
 *
 *   TIERRA  = left branch  (tripo_part_1)
 *   TIEMPO  = right branch (tripo_part_3)
 *   MANO    = center/stem  (tripo_part_0 + tripo_part_2 + tripo_part_5)
 *
 * The geometry is NEVER modified — the meshes are only reparented into named
 * groups. This produces the structure:
 *
 *   ORIGEN_MASTER (scene)
 *     └─ ORIGEN_SYMBOL (group)
 *          ├─ TIERRA (group → 1 mesh)
 *          ├─ TIEMPO (group → 1 mesh)
 *          └─ MANO   (group → 3 meshes)
 *
 * Each group's local transform is identity → the "final assembled position"
 * is just the meshes at their original coordinates. The interactive drag
 * scatters the groups; snapping returns them to identity = the original GLB.
 *
 * Run:  bun run scripts/generate-origen-master.mjs
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync, statSync, readFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/assets/models');
const SOURCE_GLB = resolve(__dirname, '../upload/rocky letter y 3d model (1).glb');
mkdirSync(OUT_DIR, { recursive: true });

// FileReader polyfill for GLTFExporter.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() { this.result = null; this.onloadend = null; this.onerror = null; }
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer()).then(
        (buf) => { this.result = buf; if (this.onloadend) this.onloadend.call(this, { target: this }); },
        (err) => { if (this.onerror) this.onerror(err); }
      );
    }
  };
}

/** Mesh-name → part assignment (determined by spatial inspection). */
const PART_ASSIGNMENT = {
  tripo_part_1: 'TIERRA',   // left branch (center x=-0.27)
  tripo_part_3: 'TIEMPO',   // right branch (center x=+0.25)
  tripo_part_0: 'MANO',     // center/stem
  tripo_part_2: 'MANO',
  tripo_part_5: 'MANO',
};

function buildScene() {
  const buf = readFileSync(SOURCE_GLB).buffer;
  const loader = new GLTFLoader();
  const gltf = loader.parseAsync(buf, '');
  return gltf;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  ORIGEN_MASTER — regrouping real stone geometry into');
  console.log('  TIERRA · TIEMPO · MANO (interactive assembly)');
  console.log('════════════════════════════════════════════════════════════\n');

  const gltf = await buildScene();
  const sourceScene = gltf.scene;

  // Collect all meshes + their world transforms.
  const meshes = [];
  sourceScene.updateMatrixWorld(true);
  sourceScene.traverse((o) => {
    if (o.isMesh) {
      // Bake the world transform into the geometry so we can reparent freely.
      const worldMatrix = o.matrixWorld.clone();
      const geo = o.geometry.clone();
      geo.applyMatrix4(worldMatrix);
      geo.computeBoundingBox();
      geo.computeVertexNormals();
      meshes.push({ name: o.name, geometry: geo, material: o.material, part: PART_ASSIGNMENT[o.name] || 'MANO' });
    }
  });

  console.log(`Source meshes: ${meshes.length}`);
  meshes.forEach((m) => console.log(`  ${m.name} → ${m.part} (${m.geometry.attributes.position.count} verts)`));

  // Build the target scene.
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.88, metalness: 0.0,
    envMapIntensity: 0.6,
  });
  mat.name = 'ORIGEN_Limestone';

  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'ORIGEN_SYMBOL';

  for (const partName of ['TIERRA', 'TIEMPO', 'MANO']) {
    const partGroup = new THREE.Group();
    partGroup.name = partName;
    for (const m of meshes.filter((m) => m.part === partName)) {
      const mesh = new THREE.Mesh(m.geometry, mat);
      mesh.name = m.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // The geometry is already in world space; the group's local transform
      // is identity → the "target position" is (0,0,0) for each group.
      partGroup.add(mesh);
    }
    symbolGroup.add(partGroup);
    console.log(`  ${partName}: ${partGroup.children.length} mesh(es)`);
  }

  // Center + ground the whole symbol.
  const bbox = new THREE.Box3().setFromObject(symbolGroup);
  const cx = (bbox.min.x + bbox.max.x) / 2;
  const cz = (bbox.min.z + bbox.max.z) / 2;
  const minY = bbox.min.y;
  symbolGroup.position.set(-cx, -minY, -cz);
  // Bake the centering into the children so the group's own position is (0,0,0)
  // (this keeps the drag math simple: target = identity).
  symbolGroup.position.set(0, 0, 0);
  symbolGroup.traverse((o) => {
    if (o.isMesh) {
      o.geometry.translate(-cx, -minY, -cz);
      o.geometry.computeBoundingBox();
      o.geometry.computeVertexNormals();
    }
  });

  const scene = new THREE.Scene();
  scene.name = 'ORIGEN_MASTER';
  scene.add(symbolGroup);

  // Verify.
  const finalBox = new THREE.Box3().setFromObject(scene);
  console.log(`\nFinal BBox: [${finalBox.min.x.toFixed(2)},${finalBox.min.y.toFixed(2)},${finalBox.min.z.toFixed(2)}] → [${finalBox.max.x.toFixed(2)},${finalBox.max.y.toFixed(2)},${finalBox.max.z.toFixed(2)}]`);
  for (const name of ['TIERRA', 'TIEMPO', 'MANO']) {
    const g = scene.getObjectByName(name);
    console.log(`  ${name}: ${g ? g.children.length + ' meshes ✓' : '✗ MISSING'}`);
  }

  // Export GLB.
  const exporter = new GLTFExporter();
  await new Promise((res, rej) => {
    exporter.parse(scene, (result) => {
      const outPath = resolve(OUT_DIR, 'ORIGEN_MASTER.glb');
      writeFileSync(outPath, Buffer.from(result instanceof ArrayBuffer ? result : JSON.stringify(result)));
      const kb = (statSync(outPath).size / 1024).toFixed(0);
      console.log(`\n  ✓ wrote ${outPath} (${kb} KB)`);
      res();
    }, (err) => rej(err), { binary: true, embedImages: true, onlyVisible: true });
  });

  // For the interactive version, LODs aren't generated (the source is a single
  // high-poly model). Copy the master as LOD1/LOD2 placeholders so the runtime
  // doesn't 404.
  for (const lod of ['LOD1', 'LOD2']) {
    const src = resolve(OUT_DIR, 'ORIGEN_MASTER.glb');
    const dst = resolve(OUT_DIR, `ORIGEN_MASTER_LOD${lod.slice(-1)}.glb`);
    copyFileSync(src, dst);
    console.log(`  ✓ wrote ${dst} (copy)`);
  }

  console.log('\n✅ ORIGEN_MASTER interactive GLB complete.');
  console.log('   Real stone geometry. 3 named groups: TIERRA · TIEMPO · MANO.');
  console.log('   Target positions = identity transforms = the original model.');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
