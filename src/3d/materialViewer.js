import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createStoneMaterials } from './stonePieces.js';
import { getPerformanceProfile } from './performance.js';

/** ORIGEN — Material Viewer: real GLB only, touch-first, adaptive rendering. */
export class MaterialViewer {
  constructor(canvasId='viewer-canvas'){
    this.canvas=document.getElementById(canvasId);if(!this.canvas)return;
    this.profile=getPerformanceProfile();
    this.scene=null;this.camera=null;this.renderer=null;this.symbolMesh=null;
    this.materials=createStoneMaterials();this.currentMaterialKey='caliza';
    this.isPointerDown=false;this.previousPointerPosition={x:0,y:0};this.targetRotation={x:.1,y:.3};
    this._onResize=this.onResize.bind(this);this.init();
  }
  init(){
    const width=Math.max(this.canvas.clientWidth||600,1),height=Math.max(this.canvas.clientHeight||500,1);
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(this.profile.mobile?42:38,width/height,.1,50);
    this.camera.position.set(0,.1,this.profile.mobile?5.7:5.2);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!this.profile.lowPower,alpha:true,powerPreference:'high-performance'});
    this.renderer.setSize(width,height,false);this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene.add(new THREE.AmbientLight(0xffffff,1.1));
    const key=new THREE.DirectionalLight(0xffecd0,2.0);key.position.set(4,5,4);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0x8fa2ba,.9);fill.position.set(-4,-2,-3);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffd290,1.2);rim.position.set(0,4,-4);this.scene.add(rim);
    this.loadRealModel();this.bindControls();this.bindButtons();
    window.addEventListener('resize',this._onResize);this.animate();
  }
  loadRealModel(){
    const loader=new GLTFLoader();
    loader.load('/models/stone_y.glb',(gltf)=>{
      const model=gltf.scene;model.name='ORIGEN_REAL_VIEWER';
      model.traverse(child=>{if(child.isMesh){child.castShadow=false;child.receiveShadow=false;}});
      model.scale.setScalar(this.profile.mobile?3.0:3.4);model.position.set(0,this.profile.mobile?-1.48:-1.65,0);
      this.symbolMesh?.clear();this.symbolMesh=new THREE.Group();this.symbolMesh.name='viewer-symbol';this.symbolMesh.add(model);this.scene.add(this.symbolMesh);
      this.setMaterial(this.currentMaterialKey);
    },undefined,(error)=>console.error('[ORIGEN] stone_y.glb failed in material viewer',error));
  }
  setMaterial(key){
    const mat=this.materials[key];if(!mat)return;this.currentMaterialKey=key;
    this.symbolMesh?.traverse(node=>{if(node.isMesh)node.material=mat;});
    document.querySelectorAll('.material-btn').forEach(btn=>{const active=btn.dataset.material===key;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
  }
  bindButtons(){document.querySelectorAll('.material-btn').forEach(btn=>btn.addEventListener('click',()=>this.setMaterial(btn.dataset.material)))}
  bindControls(){
    const onDown=(x,y)=>{this.isPointerDown=true;this.previousPointerPosition={x,y};this.canvas.style.cursor='grabbing'};
    const onMove=(x,y)=>{if(!this.isPointerDown)return;const dx=x-this.previousPointerPosition.x,dy=y-this.previousPointerPosition.y;this.targetRotation.y+=dx*.009;this.targetRotation.x=THREE.MathUtils.clamp(this.targetRotation.x+dy*.009,-.6,.6);this.previousPointerPosition={x,y}};
    const onUp=()=>{this.isPointerDown=false;this.canvas.style.cursor='grab'};
    this._onMouseDown=e=>onDown(e.clientX,e.clientY);this._onMouseMove=e=>onMove(e.clientX,e.clientY);this._onMouseUp=onUp;
    this.canvas.addEventListener('mousedown',this._onMouseDown);window.addEventListener('mousemove',this._onMouseMove);window.addEventListener('mouseup',this._onMouseUp);
    this._onTouchStart=e=>{if(e.touches.length===1)onDown(e.touches[0].clientX,e.touches[0].clientY)};
    this._onTouchMove=e=>{if(e.touches.length===1){onMove(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault()}};
    this._onTouchEnd=onUp;this.canvas.addEventListener('touchstart',this._onTouchStart,{passive:true});this.canvas.addEventListener('touchmove',this._onTouchMove,{passive:false});window.addEventListener('touchend',this._onTouchEnd);
    this.canvas.style.cursor='grab';
  }
  onResize(){if(!this.canvas||!this.renderer)return;const width=this.canvas.clientWidth,height=this.canvas.clientHeight;if(!width||!height)return;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);this.renderer.setPixelRatio(this.profile.pixelRatio)}
  animate(){if(!this.renderer||!this.scene||!this.camera)return;requestAnimationFrame(this.animate.bind(this));if(this.symbolMesh&&!this.isPointerDown)this.targetRotation.y+=this.profile.reducedMotion?.0005:this.profile.mobile?.0018:.0035;if(this.symbolMesh){this.symbolMesh.rotation.y+=(this.targetRotation.y-this.symbolMesh.rotation.y)*.08;this.symbolMesh.rotation.x+=(this.targetRotation.x-this.symbolMesh.rotation.x)*.08}this.renderer.render(this.scene,this.camera)}
  dispose(){window.removeEventListener('resize',this._onResize);if(this.canvas){this.canvas.removeEventListener('mousedown',this._onMouseDown);this.canvas.removeEventListener('touchstart',this._onTouchStart);this.canvas.removeEventListener('touchmove',this._onTouchMove)}window.removeEventListener('mousemove',this._onMouseMove);window.removeEventListener('mouseup',this._onMouseUp);window.removeEventListener('touchend',this._onTouchEnd);this.renderer?.dispose()}
}
