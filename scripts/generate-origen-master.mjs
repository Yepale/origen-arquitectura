/**
 * ORIGEN_MASTER.glb generation script.
 *
 * Builds the master 3D logo symbol for "ORIGEN" — an architectural studio
 * inspired by the Sierra de Albarracín (Teruel, Spain).
 *
 * The sculpture is a single monolithic vertical form composed of three
 * interlocking stone volumes (conceptually TIERRA / TIEMPO / MANO) merged
 * into ONE watertight mesh via CSG, with a clean arched negative space.
 *
 * Output structure (single master scene):
 *   SCENE "ORIGEN_MASTER"
 *     └─ Group "ORIGEN_SYMBOL"
 *          └─ Mesh (limestone PBR material, vertex-color variation)
 *
 * Runtime must ONLY load this GLB and treat it as an immutable asset.
 *
 * Run:  bun run scripts/generate-origen-master.mjs
 */
import * as THREE from 'three';
// three-bvh-csg UMD build uses require("three") which breaks under Bun ESM.
// Import the ESM source directly.
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg/src/index.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/assets/models');
mkdirSync(OUT_DIR, { recursive: true });

// ───────────────────────────────────────────────────────────────────────────
// Polyfill FileReader for three.js GLTFExporter (Bun has global Blob but no
// FileReader). The exporter reads a Blob back into an ArrayBuffer via
// FileReader.onloadend — we emulate that with Blob.arrayBuffer().
// ───────────────────────────────────────────────────────────────────────────
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() { this.result = null; this.onloadend = null; this.onerror = null; }
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer()).then(
        (buf) => {
          this.result = buf;
          if (this.onloadend) this.onloadend.call(this, { target: this });
        },
        (err) => { if (this.onerror) this.onerror(err); }
      );
    }
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Design constants (world units). Sculpture is centered at origin, base at Y=0.
// ───────────────────────────────────────────────────────────────────────────
const DEPTH = 0.9;          // Z-depth of the monolith
const Z_HALF = DEPTH / 2;

// Vertical layout
const BASE_Y0 = 0.0;
const BASE_Y1 = 0.5;        // base plinth top
const SPRING_Y = 1.7;       // arch spring line
const LINTEL_Y0 = 1.68;    // MANO bottom (slight overlap with pillar tops)
const LINTEL_Y1 = 2.78;    // MANO top (keystone cap)

// Horizontal layout
const BASE_X = 1.1;        // base half-width (widest)
const PILLAR_OUT_BOT = 0.95;   // pillar outer x at base
const PILLAR_OUT_TOP = 0.85;   // pillar outer x at top (slight inward taper)
const PILLAR_IN = 0.28;        // pillar inner x (vertical, defines opening side)
const LINTEL_X = 0.97;         // MANO half-width (slight overlap with pillars)
const ARCH_R = 0.28;           // arch radius (= opening half-width)

// Limestone palette (warm pale stone)
const STONE_COLOR = new THREE.Color('#C7B493');   // warm pale limestone
const STONE_DARK  = new THREE.Color('#A89272');   // shadow tone variation
const STONE_LIGHT = new THREE.Color('#D8C7A4');   // highlight tone

// ───────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build an extruded prism from a 2D front silhouette (XY polygon),
 * extruded along Z and centered at Z=0. Sharp edges (no bevel) for clean
 * CSG topology — refinement comes from the PBR material + lighting.
 */
function extrudeSilhouette(points, depth = DEPTH) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Build the arch void (rectangle + semicircle) for the negative space. */
function buildArchVoid(seg = 24, depth = DEPTH) {
  const half = ARCH_R;
  const shape = new THREE.Shape();
  shape.moveTo(-half, BASE_Y1);
  shape.lineTo(half, BASE_Y1);
  shape.lineTo(half, SPRING_Y);
  for (let i = 1; i <= seg; i++) {
    const a = Math.PI * (i / seg);
    shape.lineTo(half * Math.cos(a), SPRING_Y + half * Math.sin(a));
  }
  // now at (-half, SPRING_Y) — close down the left side back to start
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ───────────────────────────────────────────────────────────────────────────
// Volume definitions (front silhouettes)
// ───────────────────────────────────────────────────────────────────────────

// 1. BASE PLINTH — wide foundation, slight inward taper
const baseGeo = extrudeSilhouette([
  { x: -BASE_X, y: BASE_Y0 },
  { x:  BASE_X, y: BASE_Y0 },
  { x:  BASE_X - 0.06, y: BASE_Y1 },
  { x: -BASE_X + 0.06, y: BASE_Y1 },
]);

// 2. LEFT PILLAR (TIERRA) — vertical with slight outward taper, inner edge straight
const leftPillarGeo = extrudeSilhouette([
  { x: -PILLAR_OUT_BOT, y: BASE_Y1 - 0.05 },   // slight overlap with base
  { x: -PILLAR_IN,       y: BASE_Y1 - 0.05 },
  { x: -PILLAR_IN,       y: LINTEL_Y0 + 0.02 }, // extend slightly into lintel
  { x: -PILLAR_OUT_TOP,  y: LINTEL_Y0 + 0.02 },
]);

// 3. RIGHT PILLAR (TIEMPO) — mirror
const rightPillarGeo = extrudeSilhouette([
  { x:  PILLAR_IN,       y: BASE_Y1 - 0.05 },
  { x:  PILLAR_OUT_BOT, y: BASE_Y1 - 0.05 },
  { x:  PILLAR_OUT_TOP, y: LINTEL_Y0 + 0.02 },
  { x:  PILLAR_IN,       y: LINTEL_Y0 + 0.02 },
]);

// 4. MANO — lintel + keystone cap (one solid block spanning the gap, arch carved)
//    Slight inward taper on the cap for a refined silhouette.
const manoGeo = extrudeSilhouette([
  { x: -LINTEL_X,             y: LINTEL_Y0 },
  { x:  LINTEL_X,             y: LINTEL_Y0 },
  { x:  LINTEL_X - 0.08,      y: LINTEL_Y1 },
  { x: -LINTEL_X + 0.08,      y: LINTEL_Y1 },
]);

// ───────────────────────────────────────────────────────────────────────────
// CSG assembly — merge all volumes, then carve the arch negative space.
// Result is ONE watertight mesh.
// ───────────────────────────────────────────────────────────────────────────
function buildMasterGeometry(arcSeg = 24) {
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];   // drop uv for cleaner topology
  // Use groups = false so result is a single material group.
  evaluator.useGroups = false;

  const brushBase   = new Brush(baseGeo,        new THREE.MeshStandardMaterial());
  const brushLeft   = new Brush(leftPillarGeo,  new THREE.MeshStandardMaterial());
  const brushRight  = new Brush(rightPillarGeo, new THREE.MeshStandardMaterial());
  const brushMano   = new Brush(manoGeo,        new THREE.MeshStandardMaterial());
  const brushVoid   = new Brush(buildArchVoid(arcSeg), new THREE.MeshStandardMaterial());

  // prepare geometries for CSG
  [brushBase, brushLeft, brushRight, brushMano, brushVoid].forEach(b => b.prepareGeometry());

  let result = evaluator.evaluate(brushBase, brushLeft, ADDITION);
  result = evaluator.evaluate(result, brushRight, ADDITION);
  result = evaluator.evaluate(result, brushMano, ADDITION);
  result = evaluator.evaluate(result, brushVoid, SUBTRACTION);

  const geo = result.geometry;
  // Clean & finalize
  geo.computeVertexNormals();
  geo.deleteAttribute('uv');        // we use vertex colors, no UVs needed for clean PBR
  geo.toNonIndexed?.();             // (no-op if already non-indexed)
  // generate flat-ish normals already computed
  return geo;
}

// ───────────────────────────────────────────────────────────────────────────
// Subtle limestone vertex-color variation (gives natural tonal shift, no
// heavy textures — keeps the GLB light & WebGL friendly).
// ───────────────────────────────────────────────────────────────────────────
function applyStoneVertexColors(geo) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  // deterministic pseudo-noise from vertex position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // low-frequency variation
    const n =
      0.50 * Math.sin(x * 1.7 + y * 0.9) +
      0.30 * Math.sin(y * 2.3 - z * 1.1) +
      0.20 * Math.sin(z * 3.1 + x * 0.4);
    const t = 0.5 + 0.5 * Math.tanh(n * 0.8);   // 0..1
    tmp.copy(STONE_DARK).lerp(STONE_LIGHT, t);
    // very subtle warm shift near the base (earth-rooted)
    const ground = THREE.MathUtils.clamp(y / (LINTEL_Y1 * 1.2), 0, 1);
    tmp.lerp(STONE_COLOR, 0.6);
    tmp.lerp(new THREE.Color('#B89E78'), (1 - ground) * 0.12);
    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// ───────────────────────────────────────────────────────────────────────────
// Material — matte limestone PBR
// ───────────────────────────────────────────────────────────────────────────
function buildLimestoneMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,           // modulated by vertex colors
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.0,
    flatShading: false,
    envMapIntensity: 0.6,
  });
  mat.name = 'ORIGEN_Limestone';
  return mat;
}

// ───────────────────────────────────────────────────────────────────────────
// Center & ground the final geometry: base sits on Y=0, centered on XZ.
// ───────────────────────────────────────────────────────────────────────────
function centerAndGround(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  const minY = bb.min.y;
  geo.translate(-cx, -minY, -cz);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
}

// ───────────────────────────────────────────────────────────────────────────
// Build the master scene graph: ORIGEN_MASTER (scene) → ORIGEN_SYMBOL (group) → mesh
// ───────────────────────────────────────────────────────────────────────────
function buildScene(geo, material) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'ORIGEN_SYMBOL_Mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'ORIGEN_SYMBOL';
  group.add(mesh);
  // Origin/pivot at world origin (geometry already centered & grounded)
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.scale.set(1, 1, 1);

  const scene = new THREE.Scene();
  scene.name = 'ORIGEN_MASTER';
  scene.add(group);
  return scene;
}

// ───────────────────────────────────────────────────────────────────────────
// GLB export
// ───────────────────────────────────────────────────────────────────────────
function exportGLB(scene, outPath) {
  const exporter = new GLTFExporter();
  return new Promise((resolvePromise, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          writeFileSync(outPath, Buffer.from(result));
        } else {
          writeFileSync(outPath, Buffer.from(JSON.stringify(result)));
        }
        console.log(`  ✓ wrote ${outPath} (${(getFileSize(outPath) / 1024).toFixed(1)} KB)`);
        resolvePromise();
      },
      (err) => reject(err),
      {
        binary: true,
        embedImages: true,
        onlyVisible: true,
        truncateDrawRange: true,
        includeCustomExtensions: false,
      }
    );
  });
}
function getFileSize(p) {
  try { return statSync(p).size; }
  catch { return 0; }
}

// Simple triangle-count based "LOD" — reduce arch curve segments and merge.
function buildLOD(arcSeg) {
  const geo = buildMasterGeometry(arcSeg);
  centerAndGround(geo);
  applyStoneVertexColors(geo);
  return geo;
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  ORIGEN_MASTER — master 3D logo symbol generation');
  console.log('════════════════════════════════════════════════════════════');

  // --- Master (high quality arch) ---
  console.log('\n[1/3] Building ORIGEN_MASTER (arc seg = 32)...');
  const masterGeo = buildMasterGeometry(32);
  centerAndGround(masterGeo);
  applyStoneVertexColors(masterGeo);
  const mat = buildLimestoneMaterial();
  const scene = buildScene(masterGeo, mat);

  const vertCount = masterGeo.attributes.position.count;
  console.log(`  • vertices: ${vertCount}`);
  const bb = masterGeo.boundingBox;
  console.log(`  • bounding box: (${bb.min.x.toFixed(2)}, ${bb.min.y.toFixed(2)}, ${bb.min.z.toFixed(2)}) → (${bb.max.x.toFixed(2)}, ${bb.max.y.toFixed(2)}, ${bb.max.z.toFixed(2)})`);

  await exportGLB(scene, resolve(OUT_DIR, 'ORIGEN_MASTER.glb'));

  // --- LOD1 (medium arch) ---
  console.log('\n[2/3] Building ORIGEN_MASTER_LOD1 (arc seg = 14)...');
  const lod1Geo = buildLOD(14);
  const lod1Scene = buildScene(lod1Geo, mat);
  console.log(`  • vertices: ${lod1Geo.attributes.position.count}`);
  await exportGLB(lod1Scene, resolve(OUT_DIR, 'ORIGEN_MASTER_LOD1.glb'));

  // --- LOD2 (low arch) ---
  console.log('\n[3/3] Building ORIGEN_MASTER_LOD2 (arc seg = 6)...');
  const lod2Geo = buildLOD(6);
  const lod2Scene = buildScene(lod2Geo, mat);
  console.log(`  • vertices: ${lod2Geo.attributes.position.count}`);
  await exportGLB(lod2Scene, resolve(OUT_DIR, 'ORIGEN_MASTER_LOD2.glb'));

  console.log('\n✅ ORIGEN_MASTER asset pipeline complete.');
  console.log(`   Output dir: ${OUT_DIR}`);
  console.log('   ─────────────────────────────────────────');
  console.log('   Runtime contract:');
  console.log('     ORIGEN_MASTER.glb → ORIGEN_SYMBOL (single mesh)');
  console.log('     Pivot: world origin. Base: Y=0. Scale: 1.');
  console.log('     Do NOT split / reposition / procedurally rebuild.');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Generation failed:', err);
  process.exit(1);
});
