import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Real 3D sculpture integration.
 * No procedural sculpture geometry. The intro uses the meshes contained in the supplied GLB.
 */
const PIECES = [
  ['tierra', new THREE.Vector3(-2.35, 0.15, 0.65), new THREE.Euler(0.10, 0.34, -0.12), new THREE.Vector3(-0.62, 0.30, 0), new THREE.Euler(0, 0, 0)],
  ['tiempo', new THREE.Vector3(0, 2.65, -0.35), new THREE.Euler(-0.18, 0.02, 0.06), new THREE.Vector3(0, 1.72, 0), new THREE.Euler(0, 0, 0)],
  ['mano', new THREE.Vector3(2.35, 0.15, 0.65), new THREE.Euler(0.10, -0.34, 0.12), new THREE.Vector3(0.62, 0.30, 0), new THREE.Euler(0, 0, 0)]
];

function collectMeshes(root) {
  const meshes = [];
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (node.isMesh && node.geometry) meshes.push(node);
  });
  return meshes.sort((a, b) => b.geometry.getAttribute('position').count - a.geometry.getAttribute('position').count);
}

function semanticMesh(meshes, key) {
  const match = meshes.find(mesh => {
    const name = `${mesh.name || ''} ${mesh.parent?.name || ''}`.toLowerCase();
    return name.includes(key);
  });
  return match || null;
}

function bakeWorldGeometry(source) {
  const geometry = source.geometry.clone();
  source.updateWorldMatrix(true, false);
  geometry.applyMatrix4(source.matrixWorld);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function normalizeGeometry(geometry, maxSize) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const scale = maxSize / Math.max(size.x, size.y, size.z, 0.001);
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2);
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function cloneMaterial(material) {
  if (Array.isArray(material)) return material.map(item => item?.clone?.() || item);
  return material?.clone?.() || material;
}

function createPiece(name, initialPos, initialRot, targetPos, targetRot, scene) {
  const group = new THREE.Group();
  group.name = `piece_${name}`;
  group.position.copy(initialPos);
  group.rotation.copy(initialRot);
  scene.add(group);
  return {
    name, group, mesh: null, glowMesh: null, ghost: null,
    initialPos: initialPos.clone(), initialRot: initialRot.clone(),
    targetPos: targetPos.clone(), targetRot: targetRot.clone(),
    isLocked: false, isDragging: false, inMagnetZone: false,
    velocity: new THREE.Vector3(), dragOffset: new THREE.Vector3(),
    idleFloatOffset: Math.random() * Math.PI * 2
  };
}

export function buildStonePieces(scene) {
  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  scene.add(symbolGroup);

  const pieces = {};
  PIECES.forEach(([name, initialPos, initialRot, targetPos, targetRot]) => {
    const piece = createPiece(name, initialPos, initialRot, targetPos, targetRot, symbolGroup);
    pieces[name] = piece;
  });

  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  pedestalGroup.visible = false;
  pedestalGroup.userData.autoRotateY = true;
  scene.add(pedestalGroup);

  const loader = new GLTFLoader();
  let loaded = 0;
  const ready = () => {
    loaded += 1;
    if (loaded >= 2) {
      symbolGroup.visible = Object.values(pieces).every(piece => piece.mesh);
      pedestalGroup.visible = true;
      const canvas = document.getElementById('main-canvas');
      if (canvas) canvas.style.opacity = '1';
    }
  };

  loader.load('/models/pedestal.glb', gltf => {
    const model = gltf.scene;
    model.name = 'ORIGEN_REAL_PEDESTAL';
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    model.scale.setScalar(1.28);
    model.position.set(0, -1.56, 0);
    pedestalGroup.add(model);
    ready();
  }, undefined, error => {
    console.error('[ORIGEN] pedestal.glb failed', error);
    ready();
  });

  const installRealSymbol = (gltf, sourceUrl) => {
    const root = gltf.scene;
    const meshes = collectMeshes(root);
    if (!meshes.length) {
      console.error(`[ORIGEN] No real meshes found in ${sourceUrl}`);
      ready();
      return;
    }

    const used = new Set();
    const assigned = PIECES.map(([name]) => {
      const named = semanticMesh(meshes, name);
      if (named && !used.has(named)) {
        used.add(named);
        return named;
      }
      return null;
    });

    // If the GLB contains three real mesh objects but they have generic names,
    // use those meshes directly. We never cut or generate geometry at runtime.
    if (assigned.some(mesh => !mesh)) {
      const remaining = meshes.filter(mesh => !used.has(mesh));
      for (let i = 0; i < assigned.length; i += 1) {
        if (!assigned[i] && remaining.length) assigned[i] = remaining.shift();
      }
    }

    const missing = assigned.some(mesh => !mesh);
    if (missing) {
      console.error('[ORIGEN] The supplied GLB does not contain three independently selectable meshes. No fake geometry will be created.');
      ready();
      return;
    }

    PIECES.forEach(([name], index) => {
      const piece = pieces[name];
      const source = assigned[index];
      const geometry = bakeWorldGeometry(source);
      normalizeGeometry(geometry, name === 'tiempo' ? 2.65 : 3.15);
      const mesh = new THREE.Mesh(geometry, cloneMaterial(source.material));
      mesh.name = `real_${name}`;
      mesh.userData.pieceName = name;
      mesh.userData.realGlb = sourceUrl;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      piece.group.add(mesh);
      piece.mesh = mesh;

      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcf72,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(geometry.clone(), glowMaterial);
      glow.name = `glow_${name}`;
      glow.scale.setScalar(1.012);
      glow.visible = false;
      piece.group.add(glow);
      piece.glowMesh = glow;
    });

    symbolGroup.visible = true;
    ready();
  };

  loader.load('/models/rocky_y.glb', gltf => installRealSymbol(gltf, 'rocky_y.glb'), undefined, error => {
    console.warn('[ORIGEN] rocky_y.glb unavailable, trying stone_y.glb', error);
    loader.load('/models/stone_y.glb', gltf => installRealSymbol(gltf, 'stone_y.glb'), undefined, fallbackError => {
      console.error('[ORIGEN] symbol GLBs failed', fallbackError);
      ready();
    });
  });

  symbolGroup.userData.pieces = pieces;
  symbolGroup.userData.targets = Object.fromEntries(PIECES.map(([name,,,targetPos]) => [name, targetPos.clone()]));
  symbolGroup.userData.introInitials = Object.fromEntries(PIECES.map(([name,initialPos,initialRot]) => [name, { pos: initialPos.clone(), rot: initialRot.clone() }]));

  return { pieces, pedestalGroup, symbolGroup };
}
