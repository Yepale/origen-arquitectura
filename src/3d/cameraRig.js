import * as THREE from 'three';
import gsap from 'gsap';
import { stoneAudio } from '../audio/stoneAudio.js';

/** ORIGEN — Camera rig calibrated for the real sculpture + pedestal stage. */
export class CameraRig {
  constructor(camera,canvas){
    this.camera=camera;this.canvas=canvas;
    this.mouseTarget=new THREE.Vector2();this.mouseCurrent=new THREE.Vector2();
    this.basePos=new THREE.Vector3(0,.55,9.65);
    this.baseLookAt=new THREE.Vector3(0,.05,0);
    this.currentLookAt=this.baseLookAt.clone();
    this.isParallaxEnabled=false;this.isTransitioning=false;
    this.bindParallax();
  }
  bindParallax(){
    this.onMouseMove=e=>{if(!this.isParallaxEnabled)return;this.mouseTarget.set((e.clientX/window.innerWidth*2-1)*.08,(-(e.clientY/window.innerHeight*2-1))*.05)};
    window.addEventListener('mousemove',this.onMouseMove);
  }
  update(){
    if(this.isTransitioning)return;
    if(!this.isParallaxEnabled){this.camera.position.copy(this.basePos);this.camera.lookAt(this.currentLookAt);return;}
    this.mouseCurrent.lerp(this.mouseTarget,.05);
    this.camera.position.x=this.basePos.x+this.mouseCurrent.x;
    this.camera.position.y=this.basePos.y+this.mouseCurrent.y;
    this.camera.lookAt(this.currentLookAt);
  }
  focusCompletedSymbol(onComplete){
    this.isParallaxEnabled=false;this.isTransitioning=true;
    const tl=gsap.timeline({onComplete});
    tl.to(this.camera.position,{x:0,y:1.05,z:8.4,duration:1.8,ease:'power2.inOut'},0);
    tl.to(this.currentLookAt,{x:0,y:.42,z:0,duration:1.8,ease:'power2.inOut',onUpdate:()=>this.camera.lookAt(this.currentLookAt)},0);
    return tl;
  }
  flyThrough(onMidpoint,onFinished){
    this.isParallaxEnabled=false;this.isTransitioning=true;stoneAudio.playWhoosh();
    const tl=gsap.timeline();
    tl.to(this.camera.position,{x:0,y:.25,z:-9.5,duration:2.8,ease:'power2.inOut',onUpdate:()=>this.camera.lookAt(this.currentLookAt)},0);
    tl.to(this.currentLookAt,{x:0,y:.05,z:-18,duration:2.8,ease:'power2.inOut'},0);
    tl.call(()=>onMidpoint?.(),null,1.4);
    tl.call(()=>{this.isTransitioning=false;onFinished?.();},null,2.9);
    return tl;
  }
  resetToIntro(){this.isTransitioning=false;this.camera.position.copy(this.basePos);this.currentLookAt.copy(this.baseLookAt);this.camera.lookAt(this.currentLookAt);this.isParallaxEnabled=false;}
  destroy(){window.removeEventListener('mousemove',this.onMouseMove);}
}
