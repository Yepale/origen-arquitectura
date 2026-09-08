import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ORIGEN — Stone Pieces & Models Integration
 *
 * Materiales PBR exactos del logo original:
 *   TIERRA  → arenisca naranja terracota  #C87040
 *   TIEMPO  → caliza crema muy pálida     #C0A878
 *   MANO    → pizarra gris antracita      #78828E
 *
 * Carga coordinada: las piezas procedurales se mantienen INVISIBLES
 * hasta que los GLB estén listos. El pedestal solo gira en Y.
 */

// ── Generador de textura mineral procedural ──────────────────────────────────
function createStoneTexture(type) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Paleta EXACTA del logo renderizado
  const palettes = {
    tierra: { r: 192, g: 104, b:  52, amp: 30, cracks: true  },
    tiempo: { r: 186, g: 162, b: 112, amp: 18, cracks: false },
    mano:   { r: 108, g: 118, b: 130, amp: 22, cracks: false },
  };
  const p = palettes[type] || palettes.tiempo;

  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Ruido multicapa orgánico: macro veta + micro granulado
      const a = Math.sin(x * 0.038 + y * 0.022 + 0.5) * Math.cos(y * 0.041 - x * 0.013);
      const b2 = Math.sin(x * 0.098 + y * 0.075) * 0.55;
      const n  = (Math.random() - 0.5) * 2 * 0.35;
      const v = (a * 0.45 + b2 * 0.25 + n * 0.3) * p.amp;

      d[i]   = Math.min(255, Math.max(0, p.r + v));
      d[i+1] = Math.min(255, Math.max(0, p.g + v * 0.87));
      d[i+2] = Math.min(255, Math.max(0, p.b + v * 0.72));
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Grietas de arenisca para TIERRA
  if (p.cracks) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(120, 60, 15, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.filter = 'blur(0.8px)';
    const lines = [
      [[70, 20], [160, 180], [230, 330]],
      [[310, 8],  [275, 160], [320, 295]],
      [[130, 390],[215, 465], [295, 510]],
      [[55, 255], [140, 305], [195, 415]],
      [[400, 180],[360, 290], [400, 420]],
    ];
    lines.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]));
      ctx.stroke();
    });
    ctx.restore();
  }

  // Mano grabada en relieve para MANO (pizarra)
  if (type === 'mano') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(45, 50, 58, 0.52)';
    ctx.filter = 'blur(4px)';
    // Palma
    ctx.beginPath();
    ctx.ellipse(256, 298, 50, 66, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dedos
    [
      { x: 192, y: 228, rx: 13, ry: 36, r: -0.38 },
      { x: 218, y: 172, rx: 12, ry: 50, r: -0.14 },
      { x: 256, y: 148, rx: 13, ry: 56, r:  0.0  },
      { x: 292, y: 172, rx: 12, ry: 48, r:  0.14 },
      { x: 322, y: 212, rx: 11, ry: 37, r:  0.34 },
    ].forEach(f => {
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createBumpTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Generador de mapa de ruido mineral (grayscale) para relieve y rugosidad ──
function createMineralNoiseTexture(scale = 1.0, contrast = 1.0) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n1 = Math.sin(x * 0.05 * scale + y * 0.03 * scale) * Math.cos(y * 0.04 * scale - x * 0.02 * scale);
      const n2 = Math.sin(x * 0.12 * scale + y * 0.1 * scale) * 0.5;
      const grain = (Math.random() - 0.5) * 0.35;
      let val = 0.5 + (n1 * 0.28 + n2 * 0.18 + grain) * contrast;
      val = Math.max(0, Math.min(1, val));
      const byteVal = Math.floor(val * 255);
      d[i] = byteVal;
      d[i+1] = byteVal;
      d[i+2] = byteVal;
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Generar coordenadas UV automáticas (Box Projection) para modelos sin UVs ──
function generateBoxUVs(geometry, scale = 1.0) {
  if (!geometry || !geometry.attributes.position) return;
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    let nx = 0, ny = 1, nz = 0;
    if (norm) {
      nx = Math.abs(norm.getX(i));
      ny = Math.abs(norm.getY(i));
      nz = Math.abs(norm.getZ(i));
    }

    let u = 0, v = 0;
    if (nx >= ny && nx >= nz) {
      u = z * scale;
      v = y * scale;
    } else if (ny >= nx && ny >= nz) {
      u = x * scale;
      v = z * scale;
    } else {
      u = x * scale;
      v = y * scale;
    }
    uvs[i * 2]     = u;
    uvs[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
}

// ── Materiales PBR — Colores y acabados EXACTOS del logo original ─────────────
export function createStoneMaterials() {
  const bump = createMineralNoiseTexture(1.2, 1.4);
  const roughMap = createMineralNoiseTexture(0.9, 0.8);

  return {
    // TIERRA — arenisca dorada / cálida de Teruel (exacto al logo)
    tierra: new THREE.MeshStandardMaterial({
      color:        0xcf823a,
      roughness:    0.88,
      roughnessMap: roughMap,
      metalness:    0.02,
      bumpMap:      bump,
      bumpScale:    0.045,
    }),
    // TIEMPO — caliza crema suave / arenisca clara pálida (exacto al logo)
    tiempo: new THREE.MeshStandardMaterial({
      color:        0xd6c4a1,
      roughness:    0.84,
      roughnessMap: roughMap,
      metalness:    0.02,
      bumpMap:      bump,
      bumpScale:    0.035,
    }),
    // MANO — pizarra gris neutral / roca gris tallada (exacto al logo)
    mano: new THREE.MeshStandardMaterial({
      color:        0x9097a0,
      roughness:    0.86,
      roughnessMap: roughMap,
      metalness:    0.03,
      bumpMap:      bump,
      bumpScale:    0.045,
    }),
    bronce: new THREE.MeshStandardMaterial({
      color: 0x9a7232, roughness: 0.5, metalness: 0.7,
    }),
    // Ghosts siempre invisibles
    targetGhost: new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    }),
    goldGlow: new THREE.MeshBasicMaterial({
      color: 0xffd060, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  };
}

// ── Geometrías procedurales de respaldo (solo en caso de error GLB) ───────────
function extrudeShape(pts, cfg = {}) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(p => s.lineTo(p[0], p[1]));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.06, bevelThickness: 0.06, ...cfg });
  g.center();
  return g;
}

function geomTierra() {
  return extrudeShape([[-0.15,-1.8],[-0.85,-1.8],[-0.85,-0.4],[-1.6,1.3],[-0.8,1.7],[-0.15,0.3]]);
}
function geomTiempo() {
  return extrudeShape([[-0.9,0.85],[-0.35,1.85],[0.35,1.85],[0.9,0.85],[0.4,0.45],[0.0,0.95],[-0.4,0.45]], { depth: 0.64 });
}
function geomMano() {
  return extrudeShape([[0.15,-1.8],[0.85,-1.8],[0.85,-0.4],[1.6,1.3],[0.8,1.7],[0.15,0.3]]);
}

// ── Builder principal ────────────────────────────────────────────────────────
export function buildStonePieces(scene) {
  const materials = createStoneMaterials();

  const targets = {
    tierra: { pos: new THREE.Vector3(-0.55, 0.35, 0.0), rot: new THREE.Euler(0,0,0) },
    tiempo: { pos: new THREE.Vector3(0.0,  1.60, 0.0), rot: new THREE.Euler(0,0,0) },
    mano:   { pos: new THREE.Vector3(0.55, 0.35,  0.0), rot: new THREE.Euler(0,0,0) },
  };

  const initials = {
    tierra: { pos: new THREE.Vector3(-2.6,  1.00, 0.35), rot: new THREE.Euler(0.08,  0.22,-0.06) },
    tiempo: { pos: new THREE.Vector3( 0.0,  2.70,-0.2 ), rot: new THREE.Euler(-0.14, 0.0,  0.0 ) },
    mano:   { pos: new THREE.Vector3( 2.6,  1.00, 0.35), rot: new THREE.Euler(0.08, -0.22, 0.06) },
  };

  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  symbolGroup.visible = false; // Oculto hasta que carguen los GLB
  scene.add(symbolGroup);

  function makePiece(name, geom, mat, initial, target) {
    const group = new THREE.Group();
    group.name = `piece_${name}`;

    // Malla procedural de respaldo — oculta inicialmente para evitar cualquier destello low-poly
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `mesh_${name}`;
    mesh.userData = { pieceName: name };
    mesh.visible = false; // Solo se activa si falla el GLB
    group.add(mesh);

    const glowG = geom.clone();
    glowG.scale(1.04, 1.04, 1.04);
    const glowMesh = new THREE.Mesh(glowG, materials.goldGlow.clone());
    glowMesh.visible = false;
    group.add(glowMesh);

    group.position.copy(initial.pos);
    group.rotation.copy(initial.rot);
    symbolGroup.add(group);

    // Ghost invisible
    const ghost = new THREE.Mesh(geom, materials.targetGhost.clone());
    ghost.position.copy(target.pos);
    ghost.rotation.copy(target.rot);
    ghost.name = `ghost_${name}`;
    ghost.visible = false;
    symbolGroup.add(ghost);

    return {
      name, group, mesh, glowMesh, ghost,
      initialPos: initial.pos.clone(),
      initialRot: initial.rot.clone(),
      targetPos:  target.pos.clone(),
      targetRot:  target.rot.clone(),
      isLocked: false, isDragging: false,
      velocity: new THREE.Vector3(),
      dragOffset: new THREE.Vector3(),
      idleFloatOffset: Math.random() * Math.PI * 2,
    };
  }

  const pieces = {
    tierra: makePiece('tierra', geomTierra(), materials.tierra, initials.tierra, targets.tierra),
    tiempo: makePiece('tiempo', geomTiempo(), materials.tiempo, initials.tiempo, targets.tiempo),
    mano:   makePiece('mano',   geomMano(),   materials.mano,   initials.mano,   targets.mano),
  };

  // ── Pedestal ────────────────────────────────────────────────────────────────
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  pedestalGroup.visible = false; // Oculto hasta carga completa
  scene.add(pedestalGroup);

  pedestalGroup.userData.autoRotateY = true;

  const loader = new GLTFLoader();
  let glbCount = 0;

  const onGlbReady = () => {
    glbCount++;
    // Revelar toda la escena de forma coordinada, homogénea y suave
    if (glbCount >= 2) {
      symbolGroup.visible = true;
      pedestalGroup.visible = true;

      const canvas = document.getElementById('main-canvas');
      if (canvas) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            canvas.style.opacity = '1';
          });
        });
      }
    }
  };

  // Cargar Pedestal
  loader.load('/models/pedestal.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = child.receiveShadow = true;
          // Preservar UVs y mapas horneados auténticos
          if (child.material) {
            if (child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
            }
            if (child.material.normalMap) {
              child.material.normalScale.set(1.8, 1.8);
            }
            child.material.roughness = 0.76;
            child.material.metalness = 0.02;
            child.material.needsUpdate = true;
          }
        }
      });

      // Escala 3.4 y posición -3.10: pedestal apoyado visualmente en el suelo (sin flotación)
      model.scale.set(3.4, 3.4, 3.4);
      model.position.set(0, -3.10, 0);
      pedestalGroup.add(model);
      onGlbReady();
    },
    undefined,
    (err) => {
      console.warn('Fallback pedestal:', err);
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 4.0, 0.4, 48),
        new THREE.MeshStandardMaterial({ color: 0x282420, roughness: 0.94 })
      );
      ped.position.y = -2.0;
      pedestalGroup.add(ped);
      onGlbReady();
    }
  );

  // Cargar Rocky Y
  loader.load('/models/rocky_y.glb',
    (gltf) => {
      const partsMap = {};
      gltf.scene.traverse(child => {
        if (child.name) partsMap[child.name] = child;
        if (child.isMesh) {
          child.castShadow = child.receiveShadow = true;
          generateBoxUVs(child.geometry, 1.2);
          if (child.parent && child.parent.name) {
            partsMap[child.parent.name] = child;
          }
        }
      });

      const SCALE = 3.4;

      // TIERRA — arenisca dorada/cálida (rama izquierda)
      if (partsMap['tripo_part_1']) {
        const m = partsMap['tripo_part_1'];
        m.material = materials.tierra;
        m.scale.set(SCALE, SCALE, SCALE);
        m.position.set(0.55, -1.65, 0);
        m.userData = { pieceName: 'tierra' };
        m.visible = true;
        pieces.tierra.group.remove(pieces.tierra.mesh);
        pieces.tierra.mesh = m;
        pieces.tierra.group.add(m);
      }

      // TIEMPO — caliza crema suave (clave central)
      if (partsMap['tripo_part_2']) {
        const m = partsMap['tripo_part_2'];
        m.material = materials.tiempo;
        m.scale.set(SCALE, SCALE, SCALE);
        m.position.set(0, -2.90, 0);
        m.userData = { pieceName: 'tiempo' };
        m.visible = true;
        pieces.tiempo.group.remove(pieces.tiempo.mesh);
        pieces.tiempo.mesh = m;
        pieces.tiempo.group.add(m);
      }

      // MANO — pizarra gris neutral con mano grabada (rama derecha)
      const manoParts = ['tripo_part_0','tripo_part_3','tripo_part_5']
        .map(n => partsMap[n]).filter(Boolean);

      if (manoParts.length > 0) {
        const mg = new THREE.Group();
        mg.name = 'mesh_mano_group';
        mg.userData = { pieceName: 'mano' };
        manoParts.forEach(m => {
          m.material = materials.mano;
          m.scale.set(SCALE, SCALE, SCALE);
          m.position.set(-0.55, -1.65, 0);
          m.userData = { pieceName: 'mano' };
          m.visible = true;
          mg.add(m);
        });
        pieces.mano.group.remove(pieces.mano.mesh);
        pieces.mano.mesh = mg;
        pieces.mano.group.add(mg);
      }

      onGlbReady();
    },
    undefined,
    (err) => {
      console.warn('Piezas procedurales activas:', err);
      // Solo en caso de error, activar las geometrías procedurales
      pieces.tierra.mesh.visible = true;
      pieces.tiempo.mesh.visible = true;
      pieces.mano.mesh.visible = true;
      onGlbReady();
    }
  );

  return { symbolGroup, pedestalGroup, pieces, materials, targets };
}
