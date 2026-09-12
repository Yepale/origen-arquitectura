import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — real GLB sculpture, calibrated to the supplied composition. */
export function createStoneMaterials(){
  const material = (color, roughness = .82, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    tierra: material(0xb97743, .9, .01),
    tiempo: material(0xd9c7a9, .86, .01),
    mano: material(0x59616b, .88, .03),
    caliza: material(0xd4c5a9, .84, .02),
    bronce: material(0x8b6914, .38, .72),
    pizarra: material(0x4a4a52, .9, .04),
    hierro: material(0x2c2c2c, .7, .65)
  };
}

const PIECES = [
  ['tierra', new THREE.Vector3(-2.18, .18, .72), new THREE.Euler(.08, .28, -.08), new THREE.Vector3(-.62, .28, 0), new THREE.Euler(0,0,0)],
  ['tiempo', new THREE.Vector3(0, 2.35, -.28), new THREE.Euler(-.12, .01, .04), new THREE.Vector3(0, 1.68, 0), new THREE.Euler(0,0,0)],
  ['mano', new THREE.Vector3(2.18, .18, .72), new THREE.Euler(.08, -.28, .08), new THREE.Vector3(.62, .28, 0), new THREE.Euler(0,0,0)]
];

function collectMeshes(root){
  const meshes=[];
  root.updateMatrixWorld(true);
  root.traverse(node=>{ if(node.isMesh && node.geometry) meshes.push(node); });
  return meshes.sort((a,b)=>b.geometry.getAttribute('position').count-a.geometry.getAttribute('position').count);
}

function findMesh(meshes,key){
  return meshes.find(mesh => `${mesh.name||''} ${mesh.parent?.name||''}`.toLowerCase().includes(key)) || null;
}

function prepareGeometry(source){
  source.updateWorldMatrix(true,false);
  const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function normalizeGeometry(geometry,maxSize){
  geometry.computeBoundingBox();
  const box=geometry.boundingBox;
  const size=box.getSize(new THREE.Vector3());
  const scale=maxSize/Math.max(size.x,size.y,size.z,.001);
  geometry.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-(box.min.z+box.max.z)/2);
  geometry.scale(scale,scale,scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function cloneMaterial(material){
  return Array.isArray(material) ? material.map(m=>m?.clone?.()||m) : material?.clone?.()||material;
}

function addPiece(piece, source, material, maxSize, sourceUrl){
  const geometry=normalizeGeometry(prepareGeometry(source),maxSize);
  const mesh=new THREE.Mesh(geometry, material || cloneMaterial(source.material));
  mesh.name=`real_${piece.name}`;
  mesh.userData.pieceName=piece.name;
  mesh.userData.realGlb=sourceUrl;
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  piece.group.clear();
  piece.group.add(mesh);
  piece.mesh=mesh;
  return mesh;
}

export function buildStonePieces(scene){
  const materials=createStoneMaterials();
  const symbolGroup=new THREE.Group();
  symbolGroup.name='symbolGroup';
  symbolGroup.visible=false;
  scene.add(symbolGroup);

  const pieces={};
  PIECES.forEach(([name,initialPos,initialRot,targetPos,targetRot])=>{
    const group=new THREE.Group();
    group.name=`piece_${name}`;
    group.position.copy(initialPos);
    group.rotation.copy(initialRot);
    symbolGroup.add(group);
    pieces[name]={name,group,mesh:null,glowMesh:null,ghost:null,initialPos:initialPos.clone(),initialRot:initialRot.clone(),targetPos:targetPos.clone(),targetRot:targetRot.clone(),isLocked:false,isDragging:false,inMagnetZone:false,velocity:new THREE.Vector3(),dragOffset:new THREE.Vector3(),idleFloatOffset:Math.random()*Math.PI*2};
  });

  const pedestalGroup=new THREE.Group();
  pedestalGroup.name='pedestal';
  pedestalGroup.visible=false;
  pedestalGroup.userData.autoRotateY=false;
  scene.add(pedestalGroup);

  const loader=new GLTFLoader();
  let pedestalReady=false, symbolReady=false;
  const reveal=()=>{
    if(!pedestalReady || !symbolReady) return;
    symbolGroup.visible=true;
    pedestalGroup.visible=true;
    const canvas=document.getElementById('main-canvas');
    if(canvas) canvas.style.opacity='1';
  };

  loader.load('/models/pedestal.glb',gltf=>{
    const model=gltf.scene;
    model.name='ORIGEN_REAL_PEDESTAL';
    model.traverse(node=>{ if(node.isMesh){ node.castShadow=true; node.receiveShadow=true; } });
    // Pedestal treated as stage/reference: large enough to read beneath the symbol, never a tiny object.
    model.scale.setScalar(2.9);
    model.position.set(0,-3.02,-.35);
    pedestalGroup.add(model);
    pedestalReady=true;
    reveal();
  },undefined,error=>{
    console.error('[ORIGEN] pedestal.glb failed',error);
    pedestalReady=true;
    reveal();
  });

  const install=(gltf,sourceUrl)=>{
    const root=gltf.scene;
    const meshes=collectMeshes(root);
    if(!meshes.length){
      console.error(`[ORIGEN] no meshes in ${sourceUrl}`);
      symbolReady=true;
      reveal();
      return;
    }

    const used=new Set();
    const byName={
      tierra:findMesh(meshes,'tierra'),
      tiempo:findMesh(meshes,'tiempo'),
      mano:findMesh(meshes,'mano')
    };
    Object.values(byName).forEach(m=>m&&used.add(m));
    const remaining=meshes.filter(m=>!used.has(m));
    ['tierra','tiempo','mano'].forEach(name=>{ if(!byName[name] && remaining.length) byName[name]=remaining.shift(); });

    if(!byName.tierra || !byName.tiempo || !byName.mano){
      console.error('[ORIGEN] rocky_y.glb does not expose three independent meshes; refusing procedural reconstruction.');
      symbolReady=true;
      reveal();
      return;
    }

    addPiece(pieces.tierra,byName.tierra,materials.tierra,2.7,sourceUrl);
    addPiece(pieces.tiempo,byName.tiempo,materials.tiempo,2.25,sourceUrl);
    addPiece(pieces.mano,byName.mano,materials.mano,2.7,sourceUrl);

    symbolReady=true;
    reveal();
  };

  loader.load('/models/rocky_y.glb',gltf=>install(gltf,'rocky_y.glb'),undefined,error=>{
    console.warn('[ORIGEN] rocky_y.glb unavailable, trying stone_y.glb',error);
    loader.load('/models/stone_y.glb',gltf=>install(gltf,'stone_y.glb'),undefined,fallbackError=>{
      console.error('[ORIGEN] symbol GLBs unavailable',fallbackError);
      symbolReady=true;
      reveal();
    });
  });

  symbolGroup.userData.pieces=pieces;
  symbolGroup.userData.targets=Object.fromEntries(PIECES.map(([name,,,target])=>[name,target.clone()]));
  symbolGroup.userData.introInitials=Object.fromEntries(PIECES.map(([name,initialPos,initialRot])=>[name,{pos:initialPos.clone(),rot:initialRot.clone()}]));
  return {pieces,pedestalGroup,symbolGroup};
}
