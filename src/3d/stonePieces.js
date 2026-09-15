import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Master symbol + separate interaction proxies. */
const PIECE_META = {
  tierra: { initial: new THREE.Vector3(-2.25, .45, .15), initialRot: new THREE.Euler(.08,.18,-.05), target: new THREE.Vector3(-.58,.35,0), targetRot: new THREE.Euler(0,0,0) },
  tiempo: { initial: new THREE.Vector3(0,2.35,0), initialRot: new THREE.Euler(-.08,0,.03), target: new THREE.Vector3(0,1.52,0), targetRot: new THREE.Euler(0,0,0) },
  mano: { initial: new THREE.Vector3(2.25,.45,.15), initialRot: new THREE.Euler(.08,-.18,.05), target: new THREE.Vector3(.58,.35,0), targetRot: new THREE.Euler(0,0,0) }
};

function markMeshes(root, pieceName='master') {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.realGlb = true;
    node.userData.pieceName = pieceName;
  });
}

function normalizeModel(root, targetHeight=3.35) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  root.updateMatrixWorld(true);
  return root;
}

function makeProxy(pieceName, piece, masterBounds) {
  const width = Math.max(masterBounds.x * .33, .35);
  const height = Math.max(masterBounds.y * .42, .45);
  const depth = Math.max(masterBounds.z * .35, .35);
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, color:0xffffff });
  const proxy = new THREE.Mesh(geometry, material);
  proxy.name = `interaction_${pieceName}`;
  proxy.userData = { pieceName, interactionProxy:true };
  proxy.position.copy(piece.targetPos);
  proxy.visible = true;
  return proxy;
}

export function buildStonePieces(scene) {
  const symbolGroup = new THREE.Group();
  symbolGroup.name = 'symbolGroup';
  scene.add(symbolGroup);

  const pieces = {};
  Object.entries(PIECE_META).forEach(([name, meta]) => {
    const anchor = new THREE.Group();
    anchor.name = `piece_${name}`;
    pieces[name] = {
      name,
      group: anchor,
      mesh: null,
      targetPos: meta.target.clone(),
      targetRot: meta.targetRot.clone(),
      initialPos: meta.initial.clone(),
      initialRot: meta.initialRot.clone(),
      isLocked:false,
      isDragging:false,
      inMagnetZone:false,
      ghost:null,
      glowMesh:null,
      idleFloatOffset:Math.random()*Math.PI*2
    };
  });

  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'pedestal';
  scene.add(pedestalGroup);

  const loader = new GLTFLoader();

  loader.load('/models/pedestal.glb', gltf => {
    const pedestal = normalizeModel(gltf.scene, 2.9);
    pedestal.name = 'ORIGEN_REAL_PEDESTAL';
    pedestal.position.set(0,-1.72,-.65);
    pedestal.scale.multiplyScalar(1.65);
    markMeshes(pedestal);
    pedestalGroup.add(pedestal);
  }, undefined, error => console.error('[ORIGEN] pedestal.glb', error));

  loader.load('/models/rocky_y.glb', gltf => {
    const master = normalizeModel(gltf.scene, 3.35);
    master.name = 'ORIGEN_MASTER_SYMBOL';
    master.position.set(0,.78,0);
    markMeshes(master);
    symbolGroup.add(master);
    symbolGroup.userData.masterSymbol = master;

    // The authored GLB remains untouched as one coherent object. Interaction uses
    // invisible semantic proxies so drag/lock logic does not modify the model.
    const masterBounds = new THREE.Box3().setFromObject(master).getSize(new THREE.Vector3());
    Object.entries(pieces).forEach(([name,piece]) => {
      piece.master = master;
      piece.group = makeProxy(name,piece,masterBounds);
      piece.mesh = piece.group;
      symbolGroup.add(piece.group);
    });
  }, undefined, error => {
    console.error('[ORIGEN] master symbol GLB failed', error);
  });

  symbolGroup.userData.pieces = pieces;
  symbolGroup.userData.targets = Object.fromEntries(Object.entries(PIECE_META).map(([name,meta]) => [name,meta.target.clone()]));
  symbolGroup.userData.introInitials = Object.fromEntries(Object.entries(PIECE_META).map(([name,meta]) => [name,{pos:meta.initial.clone(),rot:meta.initialRot.clone()}]));
  return { pieces, pedestalGroup, symbolGroup };
}
