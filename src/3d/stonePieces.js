import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Real 3D sculpture integration. No procedural sculpture geometry. */
export function createStoneMaterials(){
  return {
    caliza:new THREE.MeshStandardMaterial({color:0xd4c5a9,roughness:.84,metalness:.02}),
    bronce:new THREE.MeshStandardMaterial({color:0x8b6914,roughness:.38,metalness:.72}),
    pizarra:new THREE.MeshStandardMaterial({color:0x4a4a52,roughness:.9,metalness:.04}),
    hierro:new THREE.MeshStandardMaterial({color:0x2c2c2c,roughness:.7,metalness:.65})
  };
}

const PIECES = [
  ['tierra', new THREE.Vector3(-2.35,.15,.65), new THREE.Euler(.10,.34,-.12), new THREE.Vector3(-.62,.30,0), new THREE.Euler(0,0,0)],
  ['tiempo', new THREE.Vector3(0,2.65,-.35), new THREE.Euler(-.18,.02,.06), new THREE.Vector3(0,1.72,0), new THREE.Euler(0,0,0)],
  ['mano', new THREE.Vector3(2.35,.15,.65), new THREE.Euler(.10,-.34,.12), new THREE.Vector3(.62,.30,0), new THREE.Euler(0,0,0)]
];

function collectMeshes(root){
  const meshes=[];
  root.updateMatrixWorld(true);
  root.traverse(node=>{if(node.isMesh&&node.geometry)meshes.push(node)});
  return meshes.sort((a,b)=>b.geometry.getAttribute('position').count-a.geometry.getAttribute('position').count);
}

function findMesh(meshes,key){
  return meshes.find(mesh=>`${mesh.name||''} ${mesh.parent?.name||''}`.toLowerCase().includes(key))||null;
}

function bakeGeometry(source){
  source.updateWorldMatrix(true,false);
  const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
  geometry.computeVertexNormals();
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
  return Array.isArray(material)?material.map(m=>m?.clone?.()||m):material?.clone?.()||material;
}

export function buildStonePieces(scene){
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
  pedestalGroup.userData.autoRotateY=true;
  scene.add(pedestalGroup);

  const loader=new GLTFLoader();
  let pedestalReady=false,symbolReady=false;
  const reveal=()=>{
    if(!pedestalReady||!symbolReady)return;
    symbolGroup.visible=true;
    pedestalGroup.visible=true;
    const canvas=document.getElementById('main-canvas');
    if(canvas)canvas.style.opacity='1';
  };

  loader.load('/models/pedestal.glb',gltf=>{
    const model=gltf.scene;
    model.name='ORIGEN_REAL_PEDESTAL';
    model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
    model.scale.setScalar(1.28);
    model.position.set(0,-1.56,0);
    pedestalGroup.add(model);
    pedestalReady=true;reveal();
  },undefined,error=>{console.error('[ORIGEN] pedestal.glb failed',error);pedestalReady=true;reveal();});

  const installRealSymbol=(gltf,sourceUrl)=>{
    const root=gltf.scene;
    const meshes=collectMeshes(root);
    if(!meshes.length){console.error(`[ORIGEN] no real meshes in ${sourceUrl}`);symbolReady=true;reveal();return;}

    const used=new Set();
    const assigned=PIECES.map(([name])=>{
      const mesh=findMesh(meshes,name);
      if(mesh&&!used.has(mesh)){used.add(mesh);return mesh;}
      return null;
    });

    // Generic mesh names: use the actual GLB mesh objects directly, never cut geometry.
    const remaining=meshes.filter(mesh=>!used.has(mesh));
    assigned.forEach((mesh,index)=>{if(!mesh&&remaining.length)assigned[index]=remaining.shift();});

    if(assigned.some(mesh=>!mesh)){
      console.error('[ORIGEN] GLB must contain three independently selectable meshes; no procedural fallback is used.');
      symbolReady=true;reveal();
      return;
    }

    PIECES.forEach(([name,, ,targetPos,targetRot],index)=>{
      const piece=pieces[name];
      const source=assigned[index];
      const geometry=normalizeGeometry(bakeGeometry(source),name==='tiempo'?2.65:3.15);
      const mesh=new THREE.Mesh(geometry,cloneMaterial(source.material));
      mesh.name=`real_${name}`;
      mesh.userData.pieceName=name;
      mesh.userData.realGlb=sourceUrl;
      mesh.castShadow=true;mesh.receiveShadow=true;
      piece.group.add(mesh);piece.mesh=mesh;

      const glow=new THREE.Mesh(geometry.clone(),new THREE.MeshBasicMaterial({color:0xffcf72,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
      glow.name=`glow_${name}`;glow.scale.setScalar(1.012);glow.visible=false;
      piece.group.add(glow);piece.glowMesh=glow;
    });

    symbolReady=true;reveal();
  };

  loader.load('/models/rocky_y.glb',gltf=>installRealSymbol(gltf,'rocky_y.glb'),undefined,error=>{
    console.warn('[ORIGEN] rocky_y.glb unavailable; trying stone_y.glb',error);
    loader.load('/models/stone_y.glb',gltf=>installRealSymbol(gltf,'stone_y.glb'),undefined,fallbackError=>{
      console.error('[ORIGEN] symbol GLBs failed',fallbackError);symbolReady=true;reveal();
    });
  });

  symbolGroup.userData.pieces=pieces;
  symbolGroup.userData.targets=Object.fromEntries(PIECES.map(([name,,,target])=>[name,target.clone()]));
  symbolGroup.userData.introInitials=Object.fromEntries(PIECES.map(([name,initialPos,initialRot])=>[name,{pos:initialPos.clone(),rot:initialRot.clone()}]));
  return {pieces,pedestalGroup,symbolGroup};
}
