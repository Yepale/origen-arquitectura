import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Master symbol: intact GLB, one transform only.
 * No mesh splitting, no piece reconstruction and no procedural replacement.
 */
const MASTER_URL='/models/stone_y.glb';
const PEDESTAL_URL='/models/pedestal.glb';
const MASTER_TARGET_HEIGHT=3.35;
const PEDESTAL_SCALE=1.65;
const SYMBOL_CLEARANCE=.06;

function markMeshes(root){
  root.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=true;
    node.receiveShadow=true;
    node.userData.realGlb=true;
    node.userData.pieceName='symbol';
  });
}

function fitRootToHeight(root,targetHeight){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root);
  const height=Math.max(box.max.y-box.min.y,.001);
  root.scale.multiplyScalar(targetHeight/height);
  root.updateMatrixWorld(true);
}

function alignSymbolToPedestal(symbolRoot,pedestalRoot){
  symbolRoot.updateMatrixWorld(true);
  pedestalRoot.updateMatrixWorld(true);

  const pedestalBox=new THREE.Box3().setFromObject(pedestalRoot);
  const symbolBox=new THREE.Box3().setFromObject(symbolRoot);
  const pedestalCenter=pedestalBox.getCenter(new THREE.Vector3());
  const symbolCenter=symbolBox.getCenter(new THREE.Vector3());

  const symbolWidth=Math.max(symbolBox.max.x-symbolBox.min.x,.001);
  const pedestalWidth=Math.max(pedestalBox.max.x-pedestalBox.min.x,.001);
  const widthFit=Math.min(1.0,(pedestalWidth*.72)/symbolWidth);
  symbolRoot.scale.multiplyScalar(widthFit);
  symbolRoot.updateMatrixWorld(true);

  const fittedBox=new THREE.Box3().setFromObject(symbolRoot);
  const fittedCenter=fittedBox.getCenter(new THREE.Vector3());
  const fittedBottom=fittedBox.min.y;

  symbolRoot.position.x+=pedestalCenter.x-fittedCenter.x;
  symbolRoot.position.z+=pedestalCenter.z-fittedCenter.z;
  symbolRoot.position.y+=pedestalBox.max.y+SYMBOL_CLEARANCE-fittedBottom;
  symbolRoot.updateMatrixWorld(true);

  return {pedestalBox,symbolBox:new THREE.Box3().setFromObject(symbolRoot)};
}

export function buildStonePieces(scene){
  const symbolGroup=new THREE.Group();
  symbolGroup.name='symbolGroup';
  scene.add(symbolGroup);

  const masterGroup=new THREE.Group();
  masterGroup.name='ORIGEN_MASTER_SYMBOL_GROUP';
  symbolGroup.add(masterGroup);

  const masterState={
    name:'master',group:masterGroup,mesh:null,targetPos:new THREE.Vector3(),targetRot:new THREE.Euler(),
    initialPos:new THREE.Vector3(),initialRot:new THREE.Euler(),isLocked:false,isDragging:false,
    inMagnetZone:false,ghost:null,glowMesh:null,idleFloatOffset:0,master:true
  };

  // Keep the legacy semantic API for the interaction layer without pretending that
  // the master GLB has three independently movable visual pieces.
  const pieces={
    tierra:{...masterState,name:'tierra'},
    tiempo:{...masterState,name:'tiempo'},
    mano:{...masterState,name:'mano'}
  };

  const pedestalGroup=new THREE.Group();
  pedestalGroup.name='pedestal';
  scene.add(pedestalGroup);

  const loader=new GLTFLoader();
  loader.load(PEDESTAL_URL,gltf=>{
    const pedestal=gltf.scene;
    pedestal.name='ORIGEN_REAL_PEDESTAL';
    pedestal.scale.setScalar(PEDESTAL_SCALE);
    markMeshes(pedestal);
    pedestalGroup.add(pedestal);

    if(masterGroup.userData.masterLoaded){
      alignSymbolToPedestal(masterGroup,pedestalGroup);
    }
  },undefined,error=>console.error('[ORIGEN] pedestal.glb',error));

  loader.load(MASTER_URL,gltf=>{
    const master=gltf.scene;
    master.name='ORIGEN_MASTER_SYMBOL';
    markMeshes(master);
    fitRootToHeight(master,MASTER_TARGET_HEIGHT);
    masterGroup.add(master);
    masterGroup.userData.realGlb=true;
    masterGroup.userData.realGlbUrl=MASTER_URL;
    masterGroup.userData.masterLoaded=true;
    masterState.mesh=master;
    Object.values(pieces).forEach(piece=>{piece.mesh=master;});

    if(pedestalGroup.children.length){
      alignSymbolToPedestal(masterGroup,pedestalGroup);
    }
  },undefined,error=>console.error('[ORIGEN] stone_y.glb',error));

  symbolGroup.userData.pieces=pieces;
  symbolGroup.userData.masterGroup=masterGroup;
  symbolGroup.userData.targets={master:new THREE.Vector3()};
  symbolGroup.userData.introInitials={master:{pos:new THREE.Vector3(),rot:new THREE.Euler()}};
  symbolGroup.userData.spatialReference={
    mode:'pedestal',masterUrl:MASTER_URL,pedestalUrl:PEDESTAL_URL,masterIntact:true
  };
  return {pieces,pedestalGroup,symbolGroup,masterGroup};
}
