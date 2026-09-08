import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ORIGEN — Stone Pieces & Models Integration
 * Materiales PBR fieles al logo original:
 *   TIERRA  → arenisca naranja cálida agrietada  (#D08040)
 *   TIEMPO  → caliza crema pálida mineral         (#C4B080)
 *   MANO    → pizarra gris antracita              (#808890)
 *
 * Sin ghost markers amarillos ni anillo guía visible.
 */

// ── Generador procedural de textura mineral ──────────────────────────────────
function createStoneTexture(type = 'caliza') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Paleta exacta del logo
  const palette = {
    tierra: { r: 200, g: 118, b: 58, amp: 32 },  // Arenisca naranja cálida
    tiempo: { r: 196, g: 176, b: 122, amp: 20 },  // Caliza crema/beige
    mano:   { r: 118, g: 124, b: 136, amp: 26 },  // Pizarra gris antracita
  };

  const p = palette[type] || { r: 50, g: 50, b: 54, amp: 20 };

  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      // Ruido orgánico multicapa (simula vetas y grietas de piedra)
      const n1 = Math.sin(x * 0.04 + y * 0.02) * Math.cos(y * 0.05 - x * 0.01);
      const n2 = Math.sin(x * 0.11 + y * 0.09) * 0.6;
      const n3 = (Math.random() - 0.5) * 2 * 0.4;
      const val = (n1 * 0.45 + n2 * 0.25 + n3 * 0.3) * p.amp;

      data[idx]     = Math.min(255, Math.max(0, p.r + val));
      data[idx + 1] = Math.min(255, Math.max(0, p.g + val * 0.88));
      data[idx + 2] = Math.min(255, Math.max(0, p.b + val * 0.75));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Para MANO: añadir silueta de palma grabada en la piedra
  if (type === 'mano') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(50, 54, 62, 0.55)';
    ctx.filter = 'blur(5px)';

    // Palma
    ctx.beginPath();
    ctx.ellipse(256, 295, 52, 68, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 dedos
    const fingers = [
      { x: 192, y: 228, rX: 13, rY: 36, rot: -0.38 },
      { x: 218, y: 172, rX: 12, rY: 50, rot: -0.14 },
      { x: 256, y: 148, rX: 13, rY: 56, rot:  0.0  },
      { x: 292, y: 172, rX: 12, rY: 48, rot:  0.14 },
      { x: 322, y: 212, rX: 11, rY: 37, rot:  0.34 },
    ];
    fingers.forEach(f => {
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rX, f.rY, f.rot, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Para TIERRA: grietas diagonales que simulan arenisca
  if (type === 'tierra') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(140, 70, 20, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.filter = 'blur(1px)';
    const crackLines = [
      [[80, 30], [180, 200], [240, 340]],
      [[320, 10], [290, 150], [330, 280]],
      [[140, 400], [220, 480], [300, 510]],
      [[60, 260], [150, 310], [200, 420]],
    ];
    crackLines.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]));
      ctx.stroke();
    });
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createBumpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(256, 256);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ── Materiales PBR fieles al logo ────────────────────────────────────────────
export function createStoneMaterials() {
  const bump = createBumpTexture();

  return {
    // TIERRA — arenisca naranja cálida, rugosa, agrietada
    tierra: new THREE.MeshStandardMaterial({
      color: 0xd08040,
      map: createStoneTexture('tierra'),
      bumpMap: bump,
      bumpScale: 0.06,
      roughness: 0.90,
      metalness: 0.02,
      envMapIntensity: 0.3,
    }),

    // TIEMPO — caliza crema/beige mineral, más suave
    tiempo: new THREE.MeshStandardMaterial({
      color: 0xc4b080,
      map: createStoneTexture('tiempo'),
      bumpMap: bump,
      bumpScale: 0.04,
      roughness: 0.85,
      metalness: 0.03,
      envMapIntensity: 0.3,
    }),

    // MANO — pizarra gris antracita, más densa y fría
    mano: new THREE.MeshStandardMaterial({
      color: 0x808890,
      map: createStoneTexture('mano'),
      bumpMap: bump,
      bumpScale: 0.055,
      roughness: 0.88,
      metalness: 0.05,
      envMapIntensity: 0.25,
    }),

    // Bronce para el pedestal si se necesita
    bronce: new THREE.MeshStandardMaterial({
      color: 0x9a7232,
      roughness: 0.5,
      metalness: 0.7,
    }),

    // Ghost invisible — se crea pero con opacity 0 para lógica de snap
    // NO se muestra visualmente en escena
    targetGhost: new THREE.MeshStandardMaterial({
      color: 0xb59868,
      transparent: true,
      opacity: 0.0,   // ← completamente invisible
      depthWrite: false,
    }),

    // Glow dorado para confirmación de encaje
    goldGlow: new THREE.MeshBasicMaterial({
      color: 0xffd060,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
}

// ── Geometrías procedurales de respaldo (si falla GLB) ───────────────────────
function createTierraGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, -1.8);
  shape.lineTo(-0.85, -1.8);
  shape.lineTo(-0.85, -0.4);
  shape.lineTo(-1.6, 1.3);
  shape.lineTo(-0.8, 1.7);
  shape.lineTo(-0.15, 0.3);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.6, bevelEnabled: true, bevelSegments: 4,
    steps: 1, bevelSize: 0.06, bevelThickness: 0.06
  });
  geom.center();
  return geom;
}

function createTiempoGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, 0.85);
  shape.lineTo(-0.35, 1.85);
  shape.lineTo(0.35, 1.85);
  shape.lineTo(0.9, 0.85);
  shape.lineTo(0.4, 0.45);
  shape.lineTo(0.0, 0.95);
  shape.lineTo(-0.4, 0.45);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.64, bevelEnabled: true, bevelSegments: 4,
    steps: 1, bevelSize: 0.065, bevelThickness: 0.065
  });
  geom.center();
  return geom;
}

function createManoGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.15, -1.8);
  shape.lineTo(0.85, -1.8);
  shape.lineTo(0.85, -0.4);
  shape.lineTo(1.6, 1.3);
  shape.lineTo(0.8, 1.7);
  shape.lineTo(0.15, 0.3);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.6, bevelEnabled: true, bevelSegments: 4,
    steps: 1, bevelSize: 0.06, bevelThickness: 0.06
  });
  geom.center();
  return geom;
}

// ── Constructor principal de piezas ──────────────────────────────────────────
export function buildStonePieces(scene) {
  const materials = createStoneMaterials();

  // Posiciones objetivo del símbolo ensamblado
  const targets = {
    tierra: { pos: new THREE.Vector3(-0.55, 0.0, 0.0), rot: new THREE.Euler(0, 0, 0) },
    tiempo: { pos: new THREE.Vector3(0.0, 1.25, 0.0),  rot: new THREE.Euler(0, 0, 0) },
    mano:   { pos: new THREE.Vector3(0.55, 0.0, 0.0),  rot: new THREE.Euler(0, 0, 0) },
  };

  // Posiciones de reposo inicial — triángulo espaciado para facilitar el arrastre
  const initials = {
    tierra: { pos: new THREE.Vector3(-2.6, 0.65, 0.35),  rot: new THREE.Euler(0.08,  0.22, -0.06) },
    tiempo: { pos: new THREE.Vector3(0.0,  2.35, -0.2),  rot: new THREE.Euler(-0.14, 0.0,   0.0) },
    mano:   { pos: new THREE.Vector3(2.6,  0.65, 0.35),  rot: new THREE.Euler(0.08, -0.22,  0.06) },
  };

  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  scene.add(symbolGroup);

  const geomTierra = createTierraGeometry();
  const geomTiempo = createTiempoGeometry();
  const geomMano   = createManoGeometry();

  function makePiece(name, geom, mat, initial, target) {
    const group = new THREE.Group();
    group.name = `piece_${name}`;

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    mesh.name = `mesh_${name}`;
    mesh.userData = { pieceName: name };
    group.add(mesh);

    // Glow de confirmación (invisible hasta encaje)
    const glowGeom = geom.clone();
    glowGeom.scale(1.04, 1.04, 1.04);
    const glowMesh = new THREE.Mesh(glowGeom, materials.goldGlow.clone());
    glowMesh.visible = false;
    group.add(glowMesh);

    group.position.copy(initial.pos);
    group.rotation.copy(initial.rot);
    symbolGroup.add(group);

    // Ghost completamente invisible — sólo para lógica de snap, no se dibuja
    const ghost = new THREE.Mesh(geom, materials.targetGhost.clone());
    ghost.position.copy(target.pos);
    ghost.rotation.copy(target.rot);
    ghost.name = `ghost_${name}`;
    ghost.visible = false; // ← oculto
    symbolGroup.add(ghost);

    return {
      name,
      group,
      mesh,
      glowMesh,
      ghost,
      initialPos: initial.pos.clone(),
      initialRot: initial.rot.clone(),
      targetPos:  target.pos.clone(),
      targetRot:  target.rot.clone(),
      isLocked:   false,
      isDragging: false,
      velocity:   new THREE.Vector3(),
      dragOffset: new THREE.Vector3(),
      idleFloatOffset: Math.random() * Math.PI * 2,
    };
  }

  const pieces = {
    tierra: makePiece('tierra', geomTierra, materials.tierra, initials.tierra, targets.tierra),
    tiempo: makePiece('tiempo', geomTiempo, materials.tiempo, initials.tiempo, targets.tiempo),
    mano:   makePiece('mano',   geomMano,   materials.mano,   initials.mano,   targets.mano),
  };

  // ── Pedestal ────────────────────────────────────────────────────────────────
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  scene.add(pedestalGroup);

  // Sin anillo guía visible — escena limpia
  // (el anillo amarillo se elimina completamente)

  const loader = new GLTFLoader();

  loader.load(
    '/models/pedestal.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
        }
      });
      model.scale.set(4.8, 4.8, 4.8);
      model.position.set(0, -3.48, 0);
      pedestalGroup.add(model);
    },
    undefined,
    (err) => {
      console.warn('Fallback pedestal activo:', err);
      const pedGeom = new THREE.CylinderGeometry(3.6, 4.0, 0.4, 48);
      const pedMat  = new THREE.MeshStandardMaterial({ color: 0x282420, roughness: 0.94 });
      const ped     = new THREE.Mesh(pedGeom, pedMat);
      ped.position.y = -2.0;
      pedestalGroup.add(ped);
    }
  );

  // ── Modelos GLB — piezas escultóricas (rocky_y.glb) ─────────────────────────
  loader.load(
    '/models/rocky_y.glb',
    (gltf) => {
      const partsMap = {};
      gltf.scene.traverse((child) => {
        if (child.name) partsMap[child.name] = child;
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
          if (child.parent && child.parent.name) {
            partsMap[child.parent.name] = child;
          }
        }
      });

      const SCALE = 3.4;

      // TIERRA — arenisca naranja (rama izquierda del logo)
      if (partsMap['tripo_part_1']) {
        const m = partsMap['tripo_part_1'];
        m.material = materials.tierra;
        m.scale.set(SCALE, SCALE, SCALE);
        m.position.set(0.55, -1.65, 0);
        m.userData = { pieceName: 'tierra' };
        pieces.tierra.group.remove(pieces.tierra.mesh);
        pieces.tierra.mesh = m;
        pieces.tierra.group.add(m);
      }

      // TIEMPO — caliza crema (clave central del logo)
      if (partsMap['tripo_part_2']) {
        const m = partsMap['tripo_part_2'];
        m.material = materials.tiempo;
        m.scale.set(SCALE, SCALE, SCALE);
        m.position.set(0, -2.90, 0);
        m.userData = { pieceName: 'tiempo' };
        pieces.tiempo.group.remove(pieces.tiempo.mesh);
        pieces.tiempo.mesh = m;
        pieces.tiempo.group.add(m);
      }

      // MANO — pizarra gris (rama derecha del logo, con mano grabada)
      const manoParts = ['tripo_part_0', 'tripo_part_3', 'tripo_part_5']
        .map(n => partsMap[n])
        .filter(Boolean);

      if (manoParts.length > 0) {
        const manoGroup = new THREE.Group();
        manoGroup.name = 'mesh_mano_group';
        manoGroup.userData = { pieceName: 'mano' };
        manoParts.forEach(m => {
          m.material = materials.mano;
          m.scale.set(SCALE, SCALE, SCALE);
          m.position.set(-0.55, -1.65, 0);
          m.userData = { pieceName: 'mano' };
          manoGroup.add(m);
        });
        pieces.mano.group.remove(pieces.mano.mesh);
        pieces.mano.mesh = manoGroup;
        pieces.mano.group.add(manoGroup);
      }
    },
    undefined,
    (err) => {
      console.warn('Piezas procedimentales activas:', err);
    }
  );

  return { symbolGroup, pedestalGroup, pieces, materials, targets };
}
