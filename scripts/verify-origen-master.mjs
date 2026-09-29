/**
 * Verifies ORIGEN_MASTER.glb structure & geometry contract.
 * Run: bun run scripts/verify-origen-master.mjs
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLB = resolve(__dirname, '../public/assets/models/ORIGEN_MASTER.glb');

function checkGlbHeader(buf) {
  const dv = new DataView(buf);
  const magic = dv.getUint32(0, true);
  const version = dv.getUint32(4, true);
  const length = dv.getUint32(8, true);
  console.log('GLB header:');
  console.log('  magic:   0x' + magic.toString(16).padStart(8, '0'), magic === 0x46546c67 ? '✓ glTF' : '✗');
  console.log('  version:', version, version === 2 ? '✓ 2.0' : '✗');
  console.log('  length:  ', length, length === buf.byteLength ? '✓ matches file' : '✗');
}

async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('  ORIGEN_MASTER.glb verification');
  console.log('════════════════════════════════════════════════\n');
  const buf = readFileSync(GLB).buffer;
  checkGlbHeader(buf);
  console.log('');

  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buf, '');
  const scene = gltf.scene;
  console.log('Scene name:', scene.name || '(unnamed)', '\n');

  // Walk scene graph
  function walk(obj, depth = 0) {
    const pad = '  '.repeat(depth);
    const t = obj.type;
    const n = obj.name || '(unnamed)';
    let extra = '';
    if (obj.isMesh) {
      const g = obj.geometry;
      const v = g.attributes.position ? g.attributes.position.count : 0;
      const mat = obj.material ? (obj.material.name || obj.material.type) : 'none';
      extra = ` | verts=${v} mat=${mat}`;
      if (obj.material && obj.material.vertexColors) extra += ' vertexColors✓';
    }
    console.log(`${pad}- ${t} "${n}"${extra}`);
    if (obj.position && depth === 1) console.log(`${pad}    pos: (${obj.position.x}, ${obj.position.y}, ${obj.position.z})`);
    obj.children.forEach(c => walk(c, depth + 1));
  }
  walk(scene, 0);

  // Bounding box of whole scene
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  console.log('\nOverall bounding box:');
  console.log('  min:', `(${box.min.x.toFixed(3)}, ${box.min.y.toFixed(3)}, ${box.min.z.toFixed(3)})`);
  console.log('  max:', `(${box.max.x.toFixed(3)}, ${box.max.y.toFixed(3)}, ${box.max.z.toFixed(3)})`);
  console.log('  size:', `(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);
  console.log('  center:', `(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
  console.log('\nContract checks:');
  console.log('  base on Y=0     :', Math.abs(box.min.y) < 1e-4 ? '✓' : `✗ (Y=${box.min.y})`);
  console.log('  centered XZ      :', Math.abs(center.x) < 1e-4 && Math.abs(center.z) < 1e-4 ? '✓' : '✗');
  console.log('  scale = 1        :', scene.scale.x === 1 && scene.scale.y === 1 && scene.scale.z === 1 ? '✓' : '✗');
  console.log('  rotation = 0     :', scene.rotation.x === 0 && scene.rotation.y === 0 && scene.rotation.z === 0 ? '✓' : '✗');

  // Verify ORIGEN_SYMBOL group exists
  const sym = scene.getObjectByName('ORIGEN_SYMBOL');
  console.log('  ORIGEN_SYMBOL grp:', sym ? '✓ found' : '✗ MISSING');

  console.log('\n════════════════════════════════════════════════');
  console.log('  ✓ Verification complete');
  console.log('════════════════════════════════════════════════');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
