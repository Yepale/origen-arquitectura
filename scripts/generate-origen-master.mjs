/**
 * ORIGEN_MASTER.glb generation — FINAL PHASE.
 *
 * The master symbol is now exported as THREE SEPARATE NAMED MESHES so the
 * intro assembly animation can move each part independently, then settle
 * them into the final ORIGEN emblem.
 *
 *   Scene "ORIGEN_MASTER"
 *     └─ Group "ORIGEN_SYMBOL"
 *          ├─ Mesh "TIERRA"  (left pillar — earth volume)
 *          ├─ Mesh "TIEMPO"  (right pillar — time volume)
 *          └─ Mesh "MANO"   (central lintel/keystone — hand volume, with arched underside)
 *
 * Design rules honored:
 *   - NO CSG merge — each part keeps its own geometry.
 *   - NO base plinth / pedestal — the three parts stand autonomously on Y=0.
 *   - The arch opening is built into MANO's silhouette (curved bottom edge),
 *     so no boolean subtraction is needed.
 *   - When the three parts are at their final (identity) transforms, the
 *     result is the complete ORIGEN emblem — identical to a single-piece
 *     sculpture. The animation only offsets them temporarily.
 *   - One unified pale-limestone material across all three parts → reads as
 *     ONE sculpture, not three colored pieces.
 *
 * Run:  bun run scripts/generate-origen-master.mjs
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/assets/models');
mkdirSync(OUT_DIR, { recursive: true });

// FileReader polyfill for GLTFExporter (Bun has Blob, no FileReader).
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

// ───────────────────────────────────────────────────────────────────────────
// Design constants (world units). Sculpture centered at origin, base at Y=0.
// ───────────────────────────────────────────────────────────────────────────
const DEPTH = 0.9;

// Vertical layout (NO base plinth — pillars stand directly on Y=0)
const PILLAR_Y0 = 0.0;        // pillar base on the ground
const PILLAR_Y1 = 2.2;        // pillar top (where MANO begins)
const LINTEL_Y0 = 2.2;        // MANO bottom (rests on pillar tops)
const LINTEL_Y1 = 2.78;       // MANO top (keystone cap)

// Horizontal layout
const PILLAR_OUT_BOT = 0.95;  // pillar outer x at base
const PILLAR_OUT_TOP = 0.85;  // pillar outer x at top (slight inward taper)
const PILLAR_IN = 0.30;       // pillar inner x (defines opening side)
const LINTEL_X = 1.0;         // MANO half-width (slight overhang past pillars)
const ARCH_R = 0.30;          // arch radius (= opening half-width)

// Limestone palette (warm pale stone — ONE material, reads as one sculpture)
const STONE_COLOR = new THREE.Color('#C9B89A');
const STONE_DARK = new THREE.Color('#A89272');
const STONE_LIGHT = new THREE.Color('#D8C7A4');

// ───────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ───────────────────────────────────────────────────────────────────────────

/** Extrude a 2D front silhouette (XY polygon) along Z, centered at Z=0. */
function extrudeSilhouette(points, archCurve, depth = DEPTH) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  // Optional arch curve (for MANO's arched underside)
  if (archCurve) {
    const { radius, centerY, segments, reverse } = archCurve;
    for (let i = 0; i <= segments; i++) {
      const a = Math.PI * (i / segments);
      const x = (reverse ? 1 : -1) * radius * Math.cos(a);
      const y = centerY + radius * Math.sin(a);
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: false, steps: 1, curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ───────────────────────────────────────────────────────────────────────────
// The three parts
// ───────────────────────────────────────────────────────────────────────────

/** TIERRA — left pillar (earth volume). Slight inward taper, vertical inner edge. */
function buildTierra(arcSeg = 32) {
  return extrudeSilhouette([
    { x: -PILLAR_OUT_BOT, y: PILLAR_Y0 },
    { x: -PILLAR_IN, y: PILLAR_Y0 },
    { x: -PILLAR_IN, y: PILLAR_Y1 },
    { x: -PILLAR_OUT_TOP, y: PILLAR_Y1 },
  ], null);
}

/** TIEMPO — right pillar (time volume). Mirror of TIERRA. */
function buildTiempo(arcSeg = 32) {
  return extrudeSilhouette([
    { x: PILLAR_IN, y: PILLAR_Y0 },
    { x: PILLAR_OUT_BOT, y: PILLAR_Y0 },
    { x: PILLAR_OUT_TOP, y: PILLAR_Y1 },
    { x: PILLAR_IN, y: PILLAR_Y1 },
  ], null);
}

/** MANO — central lintel/keystone (hand volume).
 *  The bottom edge has an arch curve cut into it, forming the arched opening
 *  above the pillars. No CSG needed — the arch is part of the silhouette. */
function buildMano(arcSeg = 32) {
  // Start at bottom-left, go right to the left spring of the arch, curve over
  // to the right spring, continue to bottom-right, up to top-right, across to
  // top-left, close. The arch curve creates the arched underside.
  const shape = new THREE.Shape();
  shape.moveTo(-LINTEL_X, LINTEL_Y0);                    // bottom-left
  shape.lineTo(-ARCH_R, LINTEL_Y0);                     // left spring of arch
  // Arch curve over the top (semicircle going UP into the lintel)
  for (let i = 0; i <= arcSeg; i++) {
    const a = Math.PI * (i / arcSeg);
    shape.lineTo(-ARCH_R * Math.cos(a), LINTEL_Y0 + ARCH_R * Math.sin(a));
  }
  // now at (ARCH_R, LINTEL_Y0) — right spring
  shape.lineTo(LINTEL_X, LINTEL_Y0);                    // bottom-right
  shape.lineTo(LINTEL_X - 0.10, LINTEL_Y1);             // top-right (slight taper)
  shape.lineTo(-LINTEL_X + 0.10, LINTEL_Y1);            // top-left
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH, bevelEnabled: false, steps: 1, curveSegments: 12,
  });
  geo.translate(0, 0, -DEPTH / 2);
  geo.computeVertexNormals();
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
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n =
      0.50 * Math.sin(x * 1.7 + y * 0.9) +
      0.30 * Math.sin(y * 2.3 - z * 1.1) +
      0.20 * Math.sin(z * 3.1 + x * 0.4);
    const t = 0.5 + 0.5 * Math.tanh(n * 0.8);
    tmp.copy(STONE_DARK).lerp(STONE_LIGHT, t);
    tmp.lerp(STONE_COLOR, 0.55);
    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// ───────────────────────────────────────────────────────────────────────────
// Material — matte limestone PBR (ONE material for all three parts → unified)
// ───────────────────────────────────────────────────────────────────────────
function buildLimestoneMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.88,
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
// Build the master scene graph: ORIGEN_MASTER → ORIGEN_SYMBOL → {TIERRA, TIEMPO, MANO}
// ───────────────────────────────────────────────────────────────────────────
function buildScene(arcSeg, mat) {
  const tierraGeo = buildTierra(arcSeg);
  const tiempoGeo = buildTiempo(arcSeg);
  const manoGeo = buildMano(arcSeg);
  [tierraGeo, tiempoGeo, manoGeo].forEach((g) => {
    centerAndGround(g);
    applyStoneVertexColors(g);
  });

  const tierra = new THREE.Mesh(tierraGeo, mat);
  tierra.name = 'TIERRA';
  tierra.castShadow = true;
  tierra.receiveShadow = true;

  const tiempo = new THREE.Mesh(tiempoGeo, mat);
  tiempo.name = 'TIEMPO';
  tiempo.castShadow = true;
  tiempo.receiveShadow = true;

  const mano = new THREE.Mesh(manoGeo, mat);
  mano.name = 'MANO';
  mano.castShadow = true;
  mano.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'ORIGEN_SYMBOL';
  group.add(tierra, tiempo, mano);
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
  return new Promise((res, rej) => {
    exporter.parse(scene, (result) => {
      writeFileSync(outPath, Buffer.from(result instanceof ArrayBuffer ? result : JSON.stringify(result)));
      const kb = (statSync(outPath).size / 1024).toFixed(1);
      console.log(`  ✓ wrote ${outPath} (${kb} KB)`);
      res();
    }, (err) => rej(err), { binary: true, embedImages: true, onlyVisible: true, truncateDrawRange: true });
  });
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  ORIGEN_MASTER — 3-part master symbol (TIERRA · TIEMPO · MANO)');
  console.log('════════════════════════════════════════════════════════════');

  const mat = buildLimestoneMaterial();

  console.log('\n[1/3] Building ORIGEN_MASTER (arc seg = 32)...');
  const masterScene = buildScene(32, mat);
  const tierraV = masterScene.getObjectByName('TIERRA').geometry.attributes.position.count;
  const tiempoV = masterScene.getObjectByName('TIEMPO').geometry.attributes.position.count;
  const manoV = masterScene.getObjectByName('MANO').geometry.attributes.position.count;
  console.log(`  • TIERRA verts: ${tierraV}`);
  console.log(`  • TIEMPO verts: ${tiempoV}`);
  console.log(`  • MANO  verts: ${manoV}`);
  console.log(`  • total:        ${tierraV + tiempoV + manoV}`);
  await exportGLB(masterScene, resolve(OUT_DIR, 'ORIGEN_MASTER.glb'));

  console.log('\n[2/3] Building ORIGEN_MASTER_LOD1 (arc seg = 14)...');
  const lod1Scene = buildScene(14, mat);
  await exportGLB(lod1Scene, resolve(OUT_DIR, 'ORIGEN_MASTER_LOD1.glb'));

  console.log('\n[3/3] Building ORIGEN_MASTER_LOD2 (arc seg = 6)...');
  const lod2Scene = buildScene(6, mat);
  await exportGLB(lod2Scene, resolve(OUT_DIR, 'ORIGEN_MASTER_LOD2.glb'));

  console.log('\n✅ ORIGEN_MASTER 3-part asset pipeline complete.');
  console.log('   Structure: ORIGEN_MASTER → ORIGEN_SYMBOL → {TIERRA, TIEMPO, MANO}');
  console.log('   No pedestal. No CSG merge. One unified limestone material.');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((err) => { console.error('❌ Generation failed:', err); process.exit(1); });
