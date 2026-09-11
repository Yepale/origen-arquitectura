import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** ORIGEN — Stone Pieces & Models Integration v2
 * Visual target: separated suspended fragments in initial state.
 */

function createStoneTexture(type) {
  const size = 512;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const palettes = {
    tierra:{r:192,g:104,b:52,amp:30,cracks:true},
    tiempo:{r:186,g:162,b:112,amp:18,cracks:false},
    mano:{r:108,g:118,b:130,amp:22,cracks:false}
  };
  const p = palettes[type] || palettes.tiempo;
  const img = ctx.createImageData(size,size), d = img.data;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const a=Math.sin(x*.038+y*.022+.5)*Math.cos(y*.041-x*.013);
    const b=Math.sin(x*.098+y*.075)*.55;
    const n=(Math.random()-.5)*.7;
    const v=(a*.45+b*.25+n*.3)*p.amp;
    d[i]=Math.max(0,Math.min(255,p.r+v));
    d[i+1]=Math.max(0,Math.min(255,p.g+v*.87));
    d[i+2]=Math.max(0,Math.min(255,p.b+v*.72)); d[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  if(p.cracks){ctx.save();ctx.globalCompositeOperation='multiply';ctx.strokeStyle='rgba(90,45,12,.42)';ctx.lineWidth=2;ctx.filter='blur(.6px)';[[70,20,160,180,230,330],[310,8,275,160,320,295],[130,390,215,465,295,510],[55,255,140,305,195,415],[400,180,360,290,400,420]].forEach(a=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[2],a[3]);ctx.lineTo(a[4],a[5]);ctx.stroke()});ctx.restore();}
  if(type==='mano'){
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba(35,38,43,.52)';ctx.filter='blur(3px)';ctx.beginPath();ctx.ellipse(256,298,50,66,0,0,Math.PI*2);ctx.fill();
    [{x:192,y:228,rx:13,ry:36,r:-.38},{x:218,y:172,rx:12,ry:50,r:-.14},{x:256,y:148,rx:13,ry:56,r:0},{x:292,y:172,rx:12,ry:48,r:.14},{x:322,y:212,rx:11,ry:37,r:.34}].forEach(f=>{ctx.beginPath();ctx.ellipse(f.x,f.y,f.rx,f.ry,f.r,0,Math.PI*2);ctx.fill()});ctx.restore();
  }
  return new THREE.CanvasTexture(c);
}

function createMineralNoiseTexture(scale=1,contrast=1){
  const size=512,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),img=ctx.createImageData(size,size),d=img.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;const n1=Math.sin(x*.05*scale+y*.03*scale)*Math.cos(y*.04*scale-x*.02*scale),n2=Math.sin(x*.12*scale+y*.1*scale)*.5,g=(Math.random()-.5)*.35;let v=.5+(n1*.28+n2*.18+g)*contrast;v=Math.max(0,Math.min(1,v));const q=Math.floor(v*255);d[i]=d[i+1]=d[i+2]=q;d[i+3]=255}
  ctx.putImageData(img,0,0);return new THREE.CanvasTexture(c);
}

export function createStoneMaterials(){
  const bump=createMineralNoiseTexture(1.2,1.4),roughMap=createMineralNoiseTexture(.9,.8);
  return {
    tierra:new THREE.MeshStandardMaterial({color:0xcf823a,roughness:.88,roughnessMap:roughMap,metalness:.02,bumpMap:bump,bumpScale:.045}),
    tiempo:new THREE.MeshStandardMaterial({color:0xd6c4a1,roughness:.84,roughnessMap:roughMap,metalness:.02,bumpMap:bump,bumpScale:.035}),
    mano:new THREE.MeshStandardMaterial({color:0x9097a0,roughness:.86,roughnessMap:roughMap,metalness:.03,bumpMap:bump,bumpScale:.045}),
    bronce:new THREE.MeshStandardMaterial({color:0x9a7232,roughness:.5,metalness:.7}),
    targetGhost:new THREE.MeshBasicMaterial({color:0xffd98d,transparent:true,opacity:0,depthWrite:false}),
    goldGlow:new THREE.MeshBasicMaterial({color:0xffcf72,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})
  };
}

function extrudeShape(pts,cfg={}){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>s.lineTo(p[0],p[1]));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.6,bevelEnabled:true,bevelSegments:3,bevelSize:.06,bevelThickness:.06,...cfg});g.center();return g;}
function geomTierra(){return extrudeShape([[-.15,-1.8],[-.85,-1.8],[-.85,-.4],[-1.6,1.3],[-.8,1.7],[-.15,.3]])}
function geomTiempo(){return extrudeShape([[-.9,.85],[-.35,1.85],[.35,1.85],[.9,.85],[.4,.45],[0,.95],[-.4,.45]],{depth:.64})}
function geomMano(){return extrudeShape([[.15,-1.8],[.85,-1.8],[.85,-.4],[1.6,1.3],[.8,1.7],[.15,.3]])}

export function buildStonePieces(scene){
  const materials=createStoneMaterials();
  // Wider, higher, more separated initial composition — first-state reference.
  const targets={
    tierra:{pos:new THREE.Vector3(-.62,.30,0),rot:new THREE.Euler(0,0,0)},
    tiempo:{pos:new THREE.Vector3(0,1.72,0),rot:new THREE.Euler(0,0,0)},
    mano:{pos:new THREE.Vector3(.62,.30,0),rot:new THREE.Euler(0,0,0)}
  };
  const initials={
    tierra:{pos:new THREE.Vector3(-2.35,.15,.65),rot:new THREE.Euler(.10,.34,-.12)},
    tiempo:{pos:new THREE.Vector3(0,2.65,-.35),rot:new THREE.Euler(-.18,.02,.06)},
    mano:{pos:new THREE.Vector3(2.35,.15,.65),rot:new THREE.Euler(.10,-.34,.12)}
  };

  const symbolGroup=new THREE.Group();symbolGroup.name='symbolGroup';scene.add(symbolGroup);
  function makePiece(name,geom,mat,initial,target){
    const group=new THREE.Group();group.name=`piece_${name}`;
    const mesh=new THREE.Mesh(geom,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name=`mesh_${name}`;mesh.userData={pieceName:name};mesh.visible=false;group.add(mesh);
    const glowMesh=new THREE.Mesh(geom.clone(),materials.goldGlow.clone());glowMesh.scale.setScalar(1.035);glowMesh.visible=false;group.add(glowMesh);
    group.position.copy(initial.pos);group.rotation.copy(initial.rot);symbolGroup.add(group);
    const ghost=new THREE.Mesh(geom,materials.targetGhost.clone());ghost.position.copy(target.pos);ghost.rotation.copy(target.rot);ghost.visible=false;symbolGroup.add(ghost);
    return {name,group,mesh,glowMesh,ghost,initialPos:initial.pos.clone(),initialRot:initial.rot.clone(),targetPos:target.pos.clone(),targetRot:target.rot.clone(),isLocked:false,isDragging:false,velocity:new THREE.Vector3(),dragOffset:new THREE.Vector3(),idleFloatOffset:Math.random()*Math.PI*2};
  }
  const pieces={tierra:makePiece('tierra',geomTierra(),materials.tierra,initials.tierra,targets.tierra),tiempo:makePiece('tiempo',geomTiempo(),materials.tiempo,initials.tiempo,targets.tiempo),mano:makePiece('mano',geomMano(),materials.mano,initials.mano,targets.mano)};
  const pedestalGroup=new THREE.Group();pedestalGroup.name='pedestal';scene.add(pedestalGroup);pedestalGroup.visible=false;pedestalGroup.userData.autoRotateY=true;
  const loader=new GLTFLoader();let glbCount=0;
  const onGlbReady=()=>{glbCount++;if(glbCount>=2){symbolGroup.visible=true;pedestalGroup.visible=true;const canvas=document.getElementById('main-canvas');if(canvas)canvas.style.opacity='1';}};
  loader.load('/models/pedestal.glb',gltf=>{const model=gltf.scene;model.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});model.scale.setScalar(1.28);model.position.set(0,-1.56,0);pedestalGroup.add(model);onGlbReady()},undefined,()=>{const g=new THREE.CylinderGeometry(2.15,.2,.62,96);const m=new THREE.Mesh(g,materials.tiempo);m.position.y=-1.4;m.receiveShadow=m.castShadow=true;pedestalGroup.add(m);onGlbReady()});
  loader.load('/models/rocky_y.glb',gltf=>{const model=gltf.scene;model.traverse(c=>{if(c.isMesh){c.visible=false;c.castShadow=true;c.receiveShadow=true;}});
    // Preserve GLB geometry per-piece where possible; procedural remains active fallback until models are verified.
    const map={};model.traverse(c=>{const n=(c.name||'').toLowerCase();if(n.includes('tierra'))map.tierra=c;if(n.includes('tiempo'))map.tiempo=c;if(n.includes('mano'))map.mano=c;});
    Object.entries(map).forEach(([name,obj])=>{const p=pieces[name];if(!p)return;obj.visible=true;obj.position.set(0,0,0);obj.rotation.set(0,0,0);obj.scale.setScalar(1);const holder=new THREE.Group();holder.add(obj);p.group.clear();p.group.add(holder);p.mesh=obj;p.glowMesh.visible=false;});
    // If GLB has no semantic child names, the procedural meshes remain the visual source.
    Object.values(pieces).forEach(p=>{if(!p.mesh.visible)p.mesh.visible=true});
    onGlbReady();
  },undefined,()=>{Object.values(pieces).forEach(p=>p.mesh.visible=true);onGlbReady()});
  Object.values(pieces).forEach(p=>{p.mesh.visible=true});
  symbolGroup.userData.pieces=pieces;symbolGroup.userData.introInitials=initials;symbolGroup.userData.targets=targets;
  return {pieces,pedestalGroup,symbolGroup};
}
