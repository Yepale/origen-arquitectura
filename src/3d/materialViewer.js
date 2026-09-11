import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createStoneMaterials } from './stonePieces.js';
import { getPerformanceProfile } from './performance.js';

/** ORIGEN — Material Viewer v2: touch-first + adaptive rendering. */
export class MaterialViewer {
  constructor(canvasId='viewer-canvas'){
    this.canvas=document.getElementById(canvasId);if(!this.canvas)return;
    this.profile=getPerformanceProfile();this.scene=null;this.camera=null;this.renderer=null;this.symbolMesh=null;this.materials=null;this.currentMaterialKey='caliza';this.gltfMesh=null;this.isPointerDown=false;this.previousPointerPosition={x:0,y:0};this.targetRotation={x:0.1,y:0.3};this.init();
  }
  init(){
    const width=this.canvas.clientWidth||600,height=this.canvas.clientHeight||500;this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(this.profile.mobile?42:38,width/height,.1,50);this.camera.position.set(0,.2,this.profile.mobile?5.7:5.2);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!this.profile.lowPower,alpha:true,powerPreference:'high-performance'});this.renderer.setSize(width,height,false);this.renderer.setPixelRatio(this.profile.pixelRatio);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene.add(new THREE.AmbientLight(0xffffff,1.15));const key=new THREE.DirectionalLight(0xffecd0,2.1);key.position.set(4,5,4);this.scene.add(key);const fill=new THREE.DirectionalLight(0x8fa2ba,1);fill.position.set(-4,-2,-3);this.scene.add(fill);const rim=new THREE.DirectionalLight(0xffd290,1.35);rim.position.set(0,4,-4);this.scene.add(rim);
    this.materials=createStoneMaterials();this.buildMonolith();this.bindControls();this.bindButtons();this.onResize=this.onResize.bind(this);window.addEventListener('resize',this.onResize);this.animate();
  }
  buildMonolith(){
    this.symbolMesh=new THREE.Group();this.scene.add(this.symbolMesh);const loader=new GLTFLoader();
    loader.load('/models/stone_y.glb',(gltf)=>{const model=gltf.scene;const mat=this.materials[this.currentMaterialKey];model.traverse(child=>{if(child.isMesh){this.gltfMesh=child;child.material=mat;child.castShadow=false;child.receiveShadow=false}});model.scale.setScalar(this.profile.mobile?3.0:3.4);model.position.set(0,this.profile.mobile?-1.48:-1.65,0);this.symbolMesh.clear();this.symbolMesh.add(model)},undefined,()=>this.buildProceduralFallback());
  }
  buildProceduralFallback(){
    const shape=new THREE.Shape();shape.moveTo(-.15,-1.8);shape.lineTo(-.85,-1.8);shape.lineTo(-.85,-.4);shape.lineTo(-1.6,1.3);shape.lineTo(-.8,1.7);shape.lineTo(-.15,.3);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:true,bevelSegments:this.profile.lowPower?2:4,steps:1,bevelSize:.055,bevelThickness:.055});g.center();this.symbolMesh.add(new THREE.Mesh(g,this.materials[this.currentMaterialKey]));
  }
  setMaterial(key){if(!this.materials[key])return;this.currentMaterialKey=key;const mat=this.materials[key];if(this.symbolMesh)this.symbolMesh.traverse(c=>{if(c.isMesh)c.material=mat});document.querySelectorAll('.material-btn').forEach(btn=>{const match=btn.dataset.material===key;btn.classList.toggle('active',match);btn.setAttribute('aria-pressed',match.toString())})}
  bindButtons(){document.querySelectorAll('.material-btn').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.material;if(key)this.setMaterial(key)}))}
  bindControls(){
    const el=this.canvas;const onDown=(x,y)=>{this.isPointerDown=true;this.previousPointerPosition={x,y};el.style.cursor='grabbing'};const onMove=(x,y)=>{if(!this.isPointerDown)return;const dx=x-this.previousPointerPosition.x,dy=y-this.previousPointerPosition.y;this.targetRotation.y+=dx*.009;this.targetRotation.x=THREE.MathUtils.clamp(this.targetRotation.x+dy*.009,-.6,.6);this.previousPointerPosition={x,y}};const onUp=()=>{this.isPointerDown=false;el.style.cursor='grab'};
    this._onMouseDown=e=>onDown(e.clientX,e.clientY);this._onMouseMove=e=>onMove(e.clientX,e.clientY);this._onMouseUp=onUp;el.addEventListener('mousedown',this._onMouseDown);window.addEventListener('mousemove',this._onMouseMove);window.addEventListener('mouseup',this._onMouseUp);
    this._onTouchStart=e=>{if(e.touches.length===1)onDown(e.touches[0].clientX,e.touches[0].clientY)};this._onTouchMove=e=>{if(e.touches.length===1){onMove(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault()}};this._onTouchEnd=onUp;el.addEventListener('touchstart',this._onTouchStart,{passive:true});el.addEventListener('touchmove',this._onTouchMove,{passive:false});window.addEventListener('touchend',this._onTouchEnd);el.style.cursor='grab';
  }
  onResize(){if(!this.canvas||!this.renderer)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.renderer.setPixelRatio(this.profile.pixelRatio)}
  animate(){if(!this.renderer||!this.scene||!this.camera)return;requestAnimationFrame(this.animate.bind(this));if(this.symbolMesh&&!this.isPointerDown){this.targetRotation.y+=this.profile.reducedMotion?.0005:this.profile.mobile?.0018:.0035}if(this.symbolMesh){this.symbolMesh.rotation.y+=(this.targetRotation.y-this.symbolMesh.rotation.y)*.08;this.symbolMesh.rotation.x+=(this.targetRotation.x-this.symbolMesh.rotation.x)*.08}this.renderer.render(this.scene,this.camera)}
  dispose(){window.removeEventListener('resize',this.onResize);if(this.canvas){this.canvas.removeEventListener('mousedown',this._onMouseDown);this.canvas.removeEventListener('touchstart',this._onTouchStart);this.canvas.removeEventListener('touchmove',this._onTouchMove)}window.removeEventListener('mousemove',this._onMouseMove);window.removeEventListener('mouseup',this._onMouseUp);window.removeEventListener('touchend',this._onTouchEnd);if(this.renderer)this.renderer.dispose()}
}
