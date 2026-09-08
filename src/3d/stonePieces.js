import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ORIGEN — Stone Pieces & Models Integration
 * Carga los modelos 3D reales (.glb):
 *  1. pedestal.glb: Altar de cantería ancestral
 *  2. rocky_y.glb: Las 3 piezas escultóricas (Tierra, Tiempo, Mano)
 *  3. Fallbacks procedurales inmediatos para cero latencia
 */

// Generador procedural de textura de piedra mineral
function createStoneTexture(type = 'caliza') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  let baseR, baseG, baseB, noiseAmp;
  if (type === 'tierra') {
    baseR = 175; baseG = 95; baseB = 70; // Arenisca rodeno cálida
    noiseAmp = 35;
  } else if (type === 'tiempo') {
    baseR = 215; baseG = 198; baseB = 172; // Caliza dorada
    noiseAmp = 25;
  } else if (type === 'mano') {
    baseR = 75; baseG = 78; baseB = 85; // Pizarra tallada
    noiseAmp = 30;
  } else if (type === 'bronce') {
    baseR = 165; baseG = 125; baseB = 58; // Pátina de bronce
    noiseAmp = 20;
  } else {
    baseR = 48; baseG = 48; baseB = 52; // Hierro fundido
    noiseAmp = 22;
  }

  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const n1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
      const n2 = Math.sin(x * 0.12 + y * 0.08) * 0.5;
      const n3 = (Math.random() - 0.5) * 2;
      const val = (n1 * 0.4 + n2 * 0.3 + n3 * 0.3) * noiseAmp;

      data[idx] = Math.min(255, Math.max(0, baseR + val));
      data[idx + 1] = Math.min(255, Math.max(0, baseG + val * 0.9));
      data[idx + 2] = Math.min(255, Math.max(0, baseB + val * 0.8));
      data[idx + 3] = 255;
    }
  }

  if (type === 'mano') {
    ctx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(40, 42, 48, 0.45)';
    ctx.filter = 'blur(4px)';

    // Palma
    ctx.beginPath();
    ctx.ellipse(256, 280, 50, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 Dedos
    const fingers = [
      { x: 195, y: 220, rX: 12, rY: 35, rot: -0.4 },
      { x: 220, y: 170, rX: 11, rY: 48, rot: -0.15 },
      { x: 256, y: 150, rX: 12, rY: 55, rot: 0 },
      { x: 290, y: 172, rX: 11, rY: 46, rot: 0.15 },
      { x: 320, y: 205, rX: 10, rY: 36, rot: 0.35 }
    ];
    fingers.forEach(f => {
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rX, f.rY, f.rot, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  ctx.putImageData(imgData, 0, 0);
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

export function createStoneMaterials() {
  const bump = createBumpTexture();

  return {
    tierra: new THREE.MeshStandardMaterial({
      color: 0xcb7543, // Arenisca rodeno cálida y luminosa
      map: createStoneTexture('tierra'),
      bumpMap: bump,
      bumpScale: 0.05,
      roughness: 0.86,
      metalness: 0.04
    }),
    tiempo: new THREE.MeshStandardMaterial({
      color: 0xdecfae, // Caliza mineral crema dorada
      map: createStoneTexture('tiempo'),
      bumpMap: bump,
      bumpScale: 0.042,
      roughness: 0.82,
      metalness: 0.06
    }),
    mano: new THREE.MeshStandardMaterial({
      color: 0x666b74, // Pizarra labrada ancestral
      map: createStoneTexture('mano'),
      bumpMap: bump,
      bumpScale: 0.055,
      roughness: 0.84,
      metalness: 0.08
    }),
    bronce: new THREE.MeshStandardMaterial({
      color: 0xaa8238,
      map: createStoneTexture('bronce'),
      bumpMap: bump,
      bumpScale: 0.03,
      roughness: 0.45,
      metalness: 0.75
    }),
    hierro: new THREE.MeshStandardMaterial({
      color: 0x38393d,
      map: createStoneTexture('hierro'),
      bumpMap: bump,
      bumpScale: 0.04,
      roughness: 0.65,
      metalness: 0.8
    }),
    targetGhost: new THREE.MeshStandardMaterial({
      color: 0xb59868,
      transparent: true,
      opacity: 0.16,
      wireframe: false,
      roughness: 0.9
    }),
    goldGlow: new THREE.MeshBasicMaterial({
      color: 0xf5d070,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    })
  };
}

// Geometrías procedurales de respaldo
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
    depth: 0.6,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06
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
    depth: 0.64,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.065,
    bevelThickness: 0.065
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
    depth: 0.6,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06
  });
  geom.center();
  return geom;
}

/**
 * Construye y orquesta las piezas en la escena integrando los GLB cargados
 */
export function buildStonePieces(scene) {
  const materials = createStoneMaterials();

  // Targets (posiciones de encaje ensamblado)
  const targets = {
    tierra: {
      pos: new THREE.Vector3(-0.55, 0.0, 0.0),
      rot: new THREE.Euler(0, 0, 0)
    },
    tiempo: {
      pos: new THREE.Vector3(0.0, 1.25, 0.0),
      rot: new THREE.Euler(0, 0, 0)
    },
    mano: {
      pos: new THREE.Vector3(0.55, 0.0, 0.0),
      rot: new THREE.Euler(0, 0, 0)
    }
  };

  // Posiciones de reposo inicial: Composición triangular con separación clara (TIEMPO arriba, TIERRA izquierda, MANO derecha)
  const initials = {
    tierra: {
      pos: new THREE.Vector3(-2.6, 0.65, 0.35),
      rot: new THREE.Euler(0.08, 0.22, -0.06)
    },
    tiempo: {
      pos: new THREE.Vector3(0.0, 2.35, -0.2),
      rot: new THREE.Euler(-0.14, 0.0, 0.0)
    },
    mano: {
      pos: new THREE.Vector3(2.6, 0.65, 0.35),
      rot: new THREE.Euler(0.08, -0.22, 0.06)
    }
  };

  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  scene.add(symbolGroup);

  const geomTierra = createTierraGeometry();
  const geomTiempo = createTiempoGeometry();
  const geomMano = createManoGeometry();

  function makePiece(name, geom, mat, initial, target) {
    const group = new THREE.Group();
    group.name = `piece_${name}`;

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `mesh_${name}`;
    mesh.userData = { pieceName: name };
    group.add(mesh);

    const glowGeom = geom.clone();
    glowGeom.scale(1.03, 1.03, 1.03);
    const glowMesh = new THREE.Mesh(glowGeom, materials.goldGlow.clone());
    glowMesh.visible = false;
    group.add(glowMesh);

    group.position.copy(initial.pos);
    group.rotation.copy(initial.rot);
    symbolGroup.add(group);

    const ghost = new THREE.Mesh(geom, materials.targetGhost);
    ghost.position.copy(target.pos);
    ghost.rotation.copy(target.rot);
    ghost.name = `ghost_${name}`;
    symbolGroup.add(ghost);

    return {
      name,
      group,
      mesh,
      glowMesh,
      ghost,
      initialPos: initial.pos.clone(),
      initialRot: initial.rot.clone(),
      targetPos: target.pos.clone(),
      targetRot: target.rot.clone(),
      isLocked: false,
      isDragging: false,
      velocity: new THREE.Vector3(),
      dragOffset: new THREE.Vector3(),
      idleFloatOffset: Math.random() * Math.PI * 2
    };
  }

  const pieces = {
    tierra: makePiece('tierra', geomTierra, materials.tierra, initials.tierra, targets.tierra),
    tiempo: makePiece('tiempo', geomTiempo, materials.tiempo, initials.tiempo, targets.tiempo),
    mano: makePiece('mano', geomMano, materials.mano, initials.mano, targets.mano)
  };

  // Pedestal
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  scene.add(pedestalGroup);

  // Anillo de guía rúnico en la base
  const ringGeom = new THREE.RingGeometry(1.6, 1.68, 64);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x9b7f58,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35
  });
  const guideRing = new THREE.Mesh(ringGeom, ringMat);
  guideRing.position.y = -1.64;
  pedestalGroup.add(guideRing);

  // CARGA DEL MODELO 3D DEL PEDESTAL (pedestal.glb)
  const loader = new GLTFLoader();
  loader.load(
    '/models/pedestal.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Escalar y alinear el pedestal bajo el símbolo (altura ~1.83, mesa superior a -1.65)
      model.scale.set(4.8, 4.8, 4.8);
      model.position.set(0, -3.48, 0);
      pedestalGroup.add(model);
    },
    undefined,
    (err) => {
      console.warn('Fallback pedestal procedimental activo:', err);
      // Base escalonada de respaldo si fallase la carga del GLB
      const pedGeom1 = new THREE.CylinderGeometry(3.6, 4.0, 0.4, 48);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x242426, roughness: 0.92 });
      const ped1 = new THREE.Mesh(pedGeom1, pedMat);
      ped1.position.y = -2.0;
      pedestalGroup.add(ped1);
    }
  );

  // CARGA DE LAS PIEZAS 3D ESCULTÓRICAS (rocky_y.glb)
  loader.load(
    '/models/rocky_y.glb',
    (gltf) => {
      // Extraemos las partes del GLB para sustituir los meshes
      const partsMap = {};
      gltf.scene.traverse((child) => {
        if (child.name) partsMap[child.name] = child;
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.parent && child.parent.name) {
            partsMap[child.parent.name] = child;
          }
        }
      });

      // Factor de escala para que coincida con la composición
      const SCALE = 3.4;

      // 1. TIERRA: tripo_part_1 (Rama izquierda)
      if (partsMap['tripo_part_1']) {
        const meshTierra = partsMap['tripo_part_1'];
        meshTierra.material = materials.tierra;
        meshTierra.scale.set(SCALE, SCALE, SCALE);
        // Centrar respecto al pivote de la pieza
        meshTierra.position.set(0.55, -1.65, 0);
        meshTierra.userData = { pieceName: 'tierra' };

        // Reemplazar mesh en el grupo de Tierra
        pieces.tierra.group.remove(pieces.tierra.mesh);
        pieces.tierra.mesh = meshTierra;
        pieces.tierra.group.add(meshTierra);
      }

      // 2. TIEMPO: tripo_part_2 (Clave central / unión)
      if (partsMap['tripo_part_2']) {
        const meshTiempo = partsMap['tripo_part_2'];
        meshTiempo.material = materials.tiempo;
        meshTiempo.scale.set(SCALE, SCALE, SCALE);
        // Al estar targetPos.y en 1.25, un offset Y de -2.90 sitúa la base en 1.25 - 2.90 = -1.65, alineada al milímetro
        meshTiempo.position.set(0, -2.90, 0);
        meshTiempo.userData = { pieceName: 'tiempo' };

        pieces.tiempo.group.remove(pieces.tiempo.mesh);
        pieces.tiempo.mesh = meshTiempo;
        pieces.tiempo.group.add(meshTiempo);
      }

      // 3. MANO: tripo_part_0, tripo_part_3, tripo_part_5 (Rama derecha)
      const manoSubParts = ['tripo_part_0', 'tripo_part_3', 'tripo_part_5']
        .map(name => partsMap[name])
        .filter(Boolean);

      if (manoSubParts.length > 0) {
        const manoSubGroup = new THREE.Group();
        manoSubGroup.name = 'mesh_mano_group';
        manoSubGroup.userData = { pieceName: 'mano' };

        manoSubParts.forEach(m => {
          m.material = materials.mano;
          m.scale.set(SCALE, SCALE, SCALE);
          m.position.set(-0.55, -1.65, 0);
          m.userData = { pieceName: 'mano' };
          manoSubGroup.add(m);
        });

        pieces.mano.group.remove(pieces.mano.mesh);
        pieces.mano.mesh = manoSubGroup;
        pieces.mano.group.add(manoSubGroup);
      }
    },
    undefined,
    (err) => {
      console.warn('Piezas procedimentales activas:', err);
    }
  );

  return {
    symbolGroup,
    pedestalGroup,
    pieces,
    materials,
    targets
  };
}
