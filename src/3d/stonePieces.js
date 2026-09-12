import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — REAL 3D PIECES · calibrated against supplied master GLB */
export function createStoneMaterials(){
  const mat=(color,roughness=.82,metalness=.02)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  return {
    tierra:mat(0xb86b32,.88,.01),
    tiempo:mat(0xd7c09a,.82,.01),
    mano:mat(0x4b535d,.88,.03),
    caliza:mat(0xd4c5a9,.84,.02),
    bronce:mat(0x8b6914,.38,.72),
    pizarra:mat(0x4a4a52,.9,.04),
    hierro:mat(0x2c2c2c,.7,.65)
  };
}

// The supplied GLB contains exactly three meshes, in spatial order:
// left = TIERRA, center = TIEMPO, right = MANO.
const PIECES=[
  ['tierra',new THREE.Vector3(-2.05,.18,.72),new THREE.Euler(.045,.16,-.025),new THREE.Vector3(-.58,.30,0),new THREE.Euler(0,0,0)],
  ['tiempo',new THREE.Vector3(0,2.08,-.10),new THREE.Euler(-.06,0,.02),new THREE.Vector3(0,1.62,0),new THREE.Euler(0,0,0)],
  ['mano',new THREE.Vector3(2.05,.18,.72),new THREE.Euler(.045,-.16,.025),new THREE.Vector3(.58,.30,0),new THREE.Euler(0,0,0)]
];

function collectMeshes(root){
  const meshes=[];
  root.updateMatrixWorld(true);
  root.traverse(n=>{if(n.isMesh&&n.geometry)meshes.push(n);});
  return meshes;
}

function prepareGeometry(source){
  source.updateWorldMatrix(true,false);
  const g=source.geometry.clone().applyMatrix4(source.matrixWorld);
  g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}

function centerAndScale(g,maxSize){
  g.computeBoundingBox();
  const box=g.boundingBox;
  const size=box.getSize(new THREE.Vector3());
  const s=maxSize/Math.max(size.x,size.y,size.z,.001);
  g.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-(box.min.z+box.max.z)/2);
  g.scale(s,s,s);
  g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}

function addRealPiece(piece,source,material,maxSize){
  const mesh=new THREE.Mesh(centerAndScale(prepareGeometry(source),maxSize),material);
  mesh.name=`real_${piece.name}`;
  mesh.userData={pieceName:piece.name,realGlb:true};
  mesh.castShadow=true;mesh.receiveShadow=true;
  piece.group.clear();piece.group.add(mesh);piece.mesh=mesh;
}

export function buildStonePieces(scene){
  const materials=createStoneMaterials();
  const symbolGroup=new THREE.Group();symbolGroup.name='symbolGroup';scene.add(symbolGroup);
  const pieces={};
  PIECES.forEach(([name,initialPos,initialRot,targetPos,targetRot])=>{
    const group=new THREE.Group();group.name=`piece_${name}`;group.position.copy(initialPos);group.rotation.copy(initialRot);symbolGroup.add(group);
    pieces[name]={name,group,mesh:null,glowMesh:null,ghost:null,initialPos:initialPos.clone(),initialRot:initialRot.clone(),targetPos:targetPos.clone(),targetRot:targetRot.clone(),isLocked:false,isDragging:false,inMagnetZone:false,idleFloatOffset:Math.random()*Math.PI*2};
  });

  const pedestalGroup=new THREE.Group();pedestalGroup.name='pedestal';scene.add(pedestalGroup);
  const loader=new GLTFLoader();

  loader.load('/models/pedestal.glb',gltf=>{
    const model=gltf.scene;model.name='ORIGEN_REAL_PEDESTAL';
    model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
    // Calibrated to the supplied pedestal reference: broad, visible stage under the emblem.
    model.scale.setScalar(5.6);
    model.position.set(0,-4.72,-.75);
    pedestalGroup.add(model);
  },undefined,error=>console.error('[ORIGEN] pedestal.glb',error));

  const install=(gltf,url)=>{
    const meshes=collectMeshes(gltf.scene);
    if(meshes.length!==3){
      console.error(`[ORIGEN] ${url} must contain exactly 3 meshes; found ${meshes.length}`);
      return;
    }
    // The uploaded reference GLB is spatially authored left/center/right.
    const ordered=meshes.slice().sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).x-b.getWorldPosition(new THREE.Vector3()).x);
    addRealPiece(pieces.tierra,ordered[0],materials.tierra,2.45);
    addRealPiece(pieces.tiempo,ordered[1],materials.tiempo,1.75);
    addRealPiece(pieces.mano,ordered[2],materials.mano,2.45);
    pieces.tierra.mesh.userData.realGlbUrl=url;pieces.tiempo.mesh.userData.realGlbUrl=url;pieces.mano.mesh.userData.realGlbUrl=url;
  };

  loader.load('/models/rocky_y.glb',gltf=>install(gltf,'/models/rocky_y.glb'),undefined,error=>{
    console.warn('[ORIGEN] rocky_y.glb failed; trying stone_y.glb',error);
    loader.load('/models/stone_y.glb',gltf=>install(gltf,'/models/stone_y.glb'),undefined,second=>console.error('[ORIGEN] symbol GLBs failed',second));
  });

  symbolGroup.userData.pieces=pieces;
  symbolGroup.userData.targets=Object.fromEntries(PIECES.map(([name,,,target])=>[name,target.clone()]));
  symbolGroup.userData.introInitials=Object.fromEntries(PIECES.map(([name,pos,rot])=>[name,{pos:pos.clone(),rot:rot.clone()}]));
  return {pieces,pedestalGroup,symbolGroup};
}
