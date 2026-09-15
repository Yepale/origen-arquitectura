import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Master symbol: intact GLB, single transform, no geometry splitting. */
const MASTER_POSITION=new THREE.Vector3(0,.78,0);
const MASTER_ROTATION=new THREE.Euler(0,0,0);

function markMeshes(root){
  root.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=true;
    node.receiveShadow=true;
    node.userData.realGlb=true;
    node.userData.pieceName='symbol';
  });
}

function centerModel(root,targetHeight=3.35){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const scale=targetHeight/Math.max(size.y,.001);
  root.scale.setScalar(scale);
  root.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
  root.updateMatrixWorld(true);
  return root;
}

export function buildStonePieces(scene){
  const symbolGroup=new THREE.Group();
  symbolGroup.name='symbolGroup';
  scene.add(symbolGroup);

  const masterGroup=new THREE.Group();
  masterGroup.name='ORIGEN_MASTER_SYMBOL_GROUP';
  masterGroup.position.copy(MASTER_POSITION);
  masterGroup.rotation.copy(MASTER_ROTATION);
  symbolGroup.add(masterGroup);

  // The interaction API keeps three semantic entries, but ALL three reference the
  // same intact master GLB. Dragging is handled as an interaction state only.
  const makePiece=name=>({
    name,
    group:masterGroup,
    mesh:null,
    targetPos:MASTER_POSITION.clone(),
    targetRot:MASTER_ROTATION.clone(),
    initialPos:MASTER_POSITION.clone(),
    initialRot:MASTER_ROTATION.clone(),
    isLocked:false,
    isDragging:false,
    inMagnetZone:false,
    ghost:null,
    glowMesh:null,
    idleFloatOffset:0,
    master:true
  });
  const pieces={tierra:makePiece('tierra'),tiempo:makePiece('tiempo'),mano:makePiece('mano')};

  const pedestalGroup=new THREE.Group();
  pedestalGroup.name='pedestal';
  scene.add(pedestalGroup);

  const loader=new GLTFLoader();
  loader.load('/models/pedestal.glb',gltf=>{
    const pedestal=centerModel(gltf.scene,2.9);
    pedestal.name='ORIGEN_REAL_PEDESTAL';
    pedestal.position.set(0,-1.72,-.65);
    pedestal.scale.multiplyScalar(1.65);
    markMeshes(pedestal);
    pedestalGroup.add(pedestal);
  },undefined,error=>console.error('[ORIGEN] pedestal.glb',error));

  loader.load('/models/rocky_y.glb',gltf=>{
    const master=centerModel(gltf.scene,3.35);
    master.name='ORIGEN_MASTER_SYMBOL';
    master.position.set(0,0,0);
    master.rotation.set(0,0,0);
    markMeshes(master);
    masterGroup.add(master);
    masterGroup.userData.realGlb=true;
    masterGroup.userData.realGlbUrl='/models/rocky_y.glb';
    Object.values(pieces).forEach(piece=>{piece.mesh=master;});
  },undefined,error=>console.error('[ORIGEN] rocky_y.glb',error));

  symbolGroup.userData.pieces=pieces;
  symbolGroup.userData.masterGroup=masterGroup;
  symbolGroup.userData.targets={master:MASTER_POSITION.clone()};
  symbolGroup.userData.introInitials={master:{pos:MASTER_POSITION.clone(),rot:MASTER_ROTATION.clone()}};
  return {pieces,pedestalGroup,symbolGroup,masterGroup};
}
