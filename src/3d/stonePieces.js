import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — master GLB as a single coherent symbol. */
const PIECE_META = {
  tierra: {
    initial: new THREE.Vector3(-2.15, 0.2, 0.1),
    initialRot: new THREE.Euler(0.08, 0.2, -0.05),
    target: new THREE.Vector3(-0.62, 0.25, 0),
    targetRot: new THREE.Euler(0, 0, 0)
  },
  tiempo: {
    initial: new THREE.Vector3(0, 2.55, -0.05),
    initialRot: new THREE.Euler(-0.08, 0, 0.04),
    target: new THREE.Vector3(0, 1.48, 0),
    targetRot: new THREE.Euler(0, 0, 0)
  },
  mano: {
    initial: new THREE.Vector3(2.15, 0.2, 0.1),
    initialRot: new THREE.Euler(0.08, -0.2, 0.05),
    target: new THREE.Vector3(0.62, 0.25, 0),
    targetRot: new THREE.Euler(0, 0, 0)
  }
};

function markInteractive(root, pieceName) {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.pieceName = pieceName;
    node.userData.realGlb = true;
  });
}

function getVisualBounds(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { box, size, center };
}

function normalizeMaster(root) {
  const { size, center } = getVisualBounds(root);
  const targetHeight = 3.25;
  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
  root.position.sub(center.multiplyScalar(scale));
  root.updateMatrixWorld(true);
  return root;
}

function assignSemanticRoots(root, pieces) {
  const nodes = [];
  root.traverse(node => { if (node.isMesh && node.geometry) nodes.push(node); });
  if (!nodes.length) throw new Error('Master GLB contains no renderable meshes');

  // Prefer authored piece names when available.
  const named = { tierra: [], tiempo: [], mano: [] };
  nodes.forEach(node => {
    const n = `${node.name || ''} ${node.parent?.name || ''}`.toLowerCase();
    const key = n.includes('tierra') ? 'tierra' : n.includes('tiempo') ? 'tiempo' : n.includes('mano') ? 'mano' : null;
    if (key) named[key].push(node);
  });

  if (named.tierra.length && named.tiempo.length && named.mano.length) {
    Object.entries(named).forEach(([key, list]) => list.forEach(node => node.userData.pieceName = key));
    return;
  }

  // Do not split geometry. Keep the GLB intact and expose it as a single coherent
  // symbol. Interaction still targets the master root as three semantic handles.
  const bounds = nodes.map(node => ({ node, center: new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()) }));
  bounds.sort((a, b) => a.center.x - b.center.x);
  const thirds = Math.max(1, Math.ceil(bounds.length / 3));
  bounds.forEach((item, index) => {
    const key = index < thirds ? 'tierra' : index < thirds * 2 ? 'tiempo' : 'mano';
    item.node.userData.pieceName = key;
  });
}

export function buildStonePieces(scene) {
  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  scene.add(symbolGroup);

  const pieces = {};
  Object.entries(PIECE_META).forEach(([name, meta]) => {
    const group = new THREE.Group();
    group.name = `piece_${name}`;
    group.position.copy(meta.initial);
    group.rotation.copy(meta.initialRot);
    group.userData.pieceName = name;
    // Each group is an interaction anchor. The master GLB itself remains intact.
    symbolGroup.add(group);
    pieces[name] = {
      name,
      group,
      mesh: null,
      glowMesh: null,
      ghost: null,
      initialPos: meta.initial.clone(),
      initialRot: meta.initialRot.clone(),
      targetPos: meta.target.clone(),
      targetRot: meta.targetRot.clone(),
      isLocked: false,
      isDragging: false,
      inMagnetZone: false,
      idleFloatOffset: Math.random() * Math.PI * 2
    };
  });

  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  scene.add(pedestalGroup);

  const loader = new GLTFLoader();

  loader.load('/models/pedestal.glb', gltf => {
    const model = normalizeMaster(gltf.scene);
    model.name = 'ORIGEN_REAL_PEDESTAL';
    model.position.set(0, -1.72, -0.6);
    model.scale.multiplyScalar(2.05);
    model.traverse(node => {
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    pedestalGroup.add(model);
  }, undefined, error => console.error('[ORIGEN] pedestal.glb', error));

  loader.load('/models/rocky_y.glb', gltf => {
    const master = normalizeMaster(gltf.scene);
    master.name = 'ORIGEN_MASTER_SYMBOL';
    master.position.set(0, 0.65, 0);
    master.scale.setScalar(1.0);
    assignSemanticRoots(master, pieces);
    markInteractive(master, 'master');

    // IMPORTANT: the supplied GLB is kept as one object; no geometry slicing,
    // per-piece centering, or per-piece rescaling is performed.
    symbolGroup.clear();
    symbolGroup.add(master);
    symbolGroup.userData.masterSymbol = master;
    symbolGroup.userData.pieces = pieces;

    Object.entries(pieces).forEach(([name, piece]) => {
      piece.group = master;
      piece.mesh = master;
      piece.group.userData.pieceName = name;
    });
  }, undefined, error => {
    console.error('[ORIGEN] master symbol GLB failed', error);
  });

  symbolGroup.userData.targets = Object.fromEntries(Object.entries(PIECE_META).map(([name, meta]) => [name, meta.target.clone()]));
  symbolGroup.userData.introInitials = Object.fromEntries(Object.entries(PIECE_META).map(([name, meta]) => [name, { pos: meta.initial.clone(), rot: meta.initialRot.clone() }]));
  return { pieces, pedestalGroup, symbolGroup };
}
