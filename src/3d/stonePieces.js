import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — REAL 3D PIECES · minimal calibration fix */
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

// Calibrated against the supplied ORIGEN reference image.
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

function authoredOrFallback(source, fallback){
  const sourceMaterial=Array.isArray(source?.material) ? source.material[0] : source?.material;
  if(sourceMaterial?.isMaterial){
    const m=sourceMaterial.clone();
    // Preserve the authored GLB colour/texture whenever it is actually present.
    const c=m.color;
    if(m.map || (c && (c.r<.97 || c.g<.97 || c.b<.97))) return m;
  }
  return fallback.clone();
}

function addRealPiece(piece,source,materials,maxSize){
  const fallback=piece.name==='tierra'?materials.tierra:piece.name==='tiempo'?materials.tiempo:materials.mano;
  const mesh=new THREE.Mesh(centerAndScale(prepareGeometry(source),maxSize),authoredOrFallback(source,fallback));
  mesh.name=`real_${piece.name}`;
  mesh.userData={pieceName:piece.name,realGlb:true};
  mesh.castShadow=true;mesh.receiveShadow=true;
  piece.group.clear();piece.group.add(mesh);piece.mesh=mesh;
}

// Fallback for GLBs whose three visible elements are packed into one/many mesh nodes.
// It clusters triangle centres along X into three spatial groups, so the interaction
// still receives three independent real geometries instead of a simulated Y.
function splitPackedGeometry(meshes){
  const triangles=[];
  meshes.forEach(source=>{
    const g=prepareGeometry(source).toNonIndexed();
    const pos=g.getAttribute('position');
    const triCount=Math.floor(pos.count/3);
    for(let i=0;i<triCount;i++){
      const a=i*3,b=a+1,c=a+2;
      const cx=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
      triangles.push({source,geometry:g,tri:i,cx});
    }
  });
  if(!triangles.length)return null;

  let centers=[Math.min(...triangles.map(t=>t.cx)),0,Math.max(...triangles.map(t=>t.cx))];
  for(let pass=0;pass<8;pass++){
    const groups=[[],[],[]];
    triangles.forEach(t=>{let k=0,d=Math.abs(t.cx-centers[0]);for(let i=1;i<3;i++){const nd=Math.abs(t.cx-centers[i]);if(nd<d){d=nd;k=i;}}groups[k].push(t);});
    centers=groups.map((g,i)=>g.length?g.reduce((s,t)=>s+t.cx,0)/g.length:centers[i]);
  }
  const groups=[[],[],[]];
  triangles.forEach(t=>{let k=0,d=Math.abs(t.cx-centers[0]);for(let i=1;i<3;i++){const nd=Math.abs(t.cx-centers[i]);if(nd<d){d=nd;k=i;}}groups[k].push(t);});
  groups.sort((a,b)=>(a[0]?.cx??0)-(b[0]?.cx??0));

  return groups.map(group=>{
    const positions=[];
    group.forEach(t=>{
      const p=t.geometry.getAttribute('position');
      const i=t.tri*3;
      for(let j=0;j<3;j++)positions.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j));
    });
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    return {geometry:g,source:group[0].source};
  });
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
    // Reference pedestal: broad circular stage, visible but subordinate to the symbol.
    model.scale.setScalar(5.6);
    model.position.set(0,-3.05,-.65);
    pedestalGroup.add(model);
  },undefined,error=>console.error('[ORIGEN] pedestal.glb',error));

  const install=(gltf,url)=>{
    const meshes=collectMeshes(gltf.scene);
    if(!meshes.length){console.error(`[ORIGEN] ${url} contains no renderable mesh`);return;}

    if(meshes.length===3){
      const ordered=meshes.slice().sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).x-b.getWorldPosition(new THREE.Vector3()).x);
      addRealPiece(pieces.tierra,ordered[0],materials,2.15);
      addRealPiece(pieces.tiempo,ordered[1],materials,1.65);
      addRealPiece(pieces.mano,ordered[2],materials,2.15);
    }else{
      const split=splitPackedGeometry(meshes);
      if(!split || split.length!==3){console.error(`[ORIGEN] ${url}: unable to resolve 3 spatial pieces`);return;}
      const [left,center,right]=split;
      const addPacked=(piece,item,maxSize)=>{
        const fallback=piece.name==='tierra'?materials.tierra:piece.name==='tiempo'?materials.tiempo:materials.mano;
        const mesh=new THREE.Mesh(centerAndScale(item.geometry,maxSize),authoredOrFallback(item.source,fallback));
        mesh.name=`real_${piece.name}`;mesh.userData={pieceName:piece.name,realGlb:true,realGlbUrl:url};mesh.castShadow=true;mesh.receiveShadow=true;
        piece.group.clear();piece.group.add(mesh);piece.mesh=mesh;
      };
      addPacked(pieces.tierra,left,2.15);addPacked(pieces.tiempo,center,1.65);addPacked(pieces.mano,right,2.15);
    }
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
