/**
 * pedestal.glb generation — a clean monolithic stone drum pedestal
 * inspired by the ORIGEN reference (Sierra de Albarracín masonry).
 *
 * The pedestal is ONLY a spatial reference for the runtime. It is never
 * merged into the ORIGEN symbol mesh.
 *
 * Scene: "PEDESTAL" → Group "Pedestal" → Mesh (limestone PBR)
 *
 * Run:  bun run scripts/generate-pedestal.mjs
 */
import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg/src/index.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/assets/models');
mkdirSync(OUT_DIR, { recursive: true });

// FileReader polyfill (Bun has Blob, no FileReader)
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

// Pedestal proportions (top surface will sit at Y = PEDESTAL_HEIGHT)
const R_OUTER = 1.0;     // outer radius
const R_INNER = 0.92;     // top inner (slight taper up)
const H_TOTAL = 0.7;     // total height
const RADIAL_SEG = 64;

// Build the pedestal via CSG: base ring + body + top cap + concentric grooves
function buildPedestalGeometry() {
  // Main body — slight taper (wider at bottom)
  const body = new Brush(
    new THREE.CylinderGeometry(R_INNER, R_OUTER, H_TOTAL, RADIAL_SEG, 1, false),
    new THREE.MeshStandardMaterial()
  );

  // Top cap — slightly wider lip
  const cap = new Brush(
    new THREE.CylinderGeometry(R_OUTER * 1.02, R_OUTER * 1.02, 0.06, RADIAL_SEG),
    new THREE.MeshStandardMaterial()
  );
  cap.position.y = H_TOTAL / 2 - 0.03;

  // Base ring — wider footing
  const baseRing = new Brush(
    new THREE.CylinderGeometry(R_OUTER * 1.04, R_OUTER * 1.04, 0.05, RADIAL_SEG),
    new THREE.MeshStandardMaterial()
  );
  baseRing.position.y = -H_TOTAL / 2 + 0.025;

  // Groove 1 (mid-upper)
  const groove1 = new Brush(
    new THREE.TorusGeometry(R_OUTER * 0.99, 0.018, 12, RADIAL_SEG),
    new THREE.MeshStandardMaterial()
  );
  groove1.rotation.x = Math.PI / 2;
  groove1.position.y = H_TOTAL * 0.18;

  // Groove 2 (mid-lower)
  const groove2 = new Brush(
    new THREE.TorusGeometry(R_OUTER * 1.0, 0.014, 12, RADIAL_SEG),
    new THREE.MeshStandardMaterial()
  );
  groove2.rotation.x = Math.PI / 2;
  groove2.position.y = -H_TOTAL * 0.12;

  [body, cap, baseRing, groove1, groove2].forEach(b => {
    b.geometry.computeVertexNormals();
    b.prepareGeometry();
  });

  const ev = new Evaluator();
  ev.attributes = ['position', 'normal'];
  ev.useGroups = false;

  let r = ev.evaluate(body, cap, ADDITION);
  r = ev.evaluate(r, baseRing, ADDITION);
  r = ev.evaluate(r, groove1, SUBTRACTION);
  r = ev.evaluate(r, groove2, SUBTRACTION);

  const geo = r.geometry;
  geo.computeVertexNormals();
  return geo;
}

function applyStoneColors(geo) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color('#B8A480');   // warm limestone
  const dark = new THREE.Color('#998464');   // shadow tone
  const light = new THREE.Color('#D2C19E');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.5 * Math.sin(x * 2.1 + z * 1.7) + 0.3 * Math.sin(y * 3.3);
    const t = 0.5 + 0.5 * Math.tanh(n * 0.7);
    tmp.copy(dark).lerp(light, t);
    colors[i*3] = tmp.r; colors[i*3+1] = tmp.g; colors[i*3+2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function centerAndGround(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x)/2, -bb.min.y, -(bb.min.z + bb.max.z)/2);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
}

async function exportGLB(scene, outPath) {
  const exporter = new GLTFExporter();
  return new Promise((res, rej) => {
    exporter.parse(scene, (result) => {
      writeFileSync(outPath, Buffer.from(result instanceof ArrayBuffer ? result : JSON.stringify(result)));
      console.log(`  ✓ wrote ${outPath} (${(statSync(outPath).size/1024).toFixed(1)} KB)`);
      res();
    }, (e) => rej(e), { binary: true, embedImages: true });
  });
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  pedestal.glb — spatial reference pedestal');
  console.log('════════════════════════════════════════════════════════════');
  const geo = buildPedestalGeometry();
  centerAndGround(geo);
  applyStoneColors(geo);

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.88, metalness: 0.0,
  });
  mat.name = 'Pedestal_Limestone';

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Pedestal_Mesh';
  const group = new THREE.Group();
  group.name = 'Pedestal';
  group.add(mesh);
  const scene = new THREE.Scene();
  scene.name = 'PEDESTAL';
  scene.add(group);

  const bb = geo.boundingBox;
  console.log(`  • vertices: ${geo.attributes.position.count}`);
  console.log(`  • bbox: (${bb.min.x.toFixed(2)}, ${bb.min.y.toFixed(2)}, ${bb.min.z.toFixed(2)}) → (${bb.max.x.toFixed(2)}, ${bb.max.y.toFixed(2)}, ${bb.max.z.toFixed(2)})`);

  await exportGLB(scene, resolve(OUT_DIR, 'pedestal.glb'));
  console.log('════════════════════════════════════════════════════════════');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
