import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — REAL 3D PIECES · supplied master GLB, preserved materials */
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

// The supplied GLB is the visual source of truth: three independent meshes.
const PIECES=[
  ['tierra',new THREE.Vector3(-1.82,.55,.20),new THREE.Euler(0,0,0),new THREE.Vector3(-.57,.33,0),new THREE.Euler(0,0,0)],
  ['tiempo',new THREE.Vector3(0,1.78,.05),new THREE.Euler(0,0,0),new THREE.Vector3(0,1.58,0),new THREE.Euler(0,0,0)],
  ['mano',new THREE.Vector3(1.82,.55,.20),new THREE.Euler(0,0,0),new THREE.Vector3(.57,.33,0),new THREE.Euler(0,0,0)]
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

function materialForPiece(materials,name,source){
  // Keep the authored look of the supplied GLB, but guarantee the semantic palette.
  if(name==='tierra') return materials.tierra.clone();
  if(name==='tiempo') return materials.tiempo.clone();
  if(name==='mano') return materials.mano.clone();
  return source?.material?.clone?.() || materials.caliza.clone();
}

function addRealPiece(piece,source,materials,maxSize){
  const mesh=new THREE.Mesh(centerAndScale(prepareGeometry(source),maxSize),materialForPiece(materials,piece.name,source));
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
    // Match the supplied pedestal reference: broad circular stage, centered below the emblem.
    model.scale.setScalar(5.6);
    model.position.set(0,-3.05,-.65);
    pedestalGroup.add(model);
  },undefined,error=>console.error('[ORIGEN] pedestal.glb',error));

  const install=(gltf,url)=>{
    const meshes=collectMeshes(gltf.scene);
    if(meshes.length<3){
      console.error(`[ORIGEN] ${url} must expose at least 3 meshes; found ${meshes.length}`);
      return;
    }
    const ordered=meshes.slice().sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).x-b.getWorldPosition(new THREE.Vector3()).x);
    addRealPiece(pieces.tierra,ordered[0],materials,2.15);
    addRealPiece(pieces.tiempo,ordered[Math.floor(ordered.length/2)],materials,1.65);
    addRealPiece(pieces.mano,ordered[ordered.length-1],materials,2.15);
    [pieces.tierra,pieces.tiempo,pieces.mano].forEach(p=>{if(p.mesh)p.mesh.userData.realGlbUrl=url;});
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
