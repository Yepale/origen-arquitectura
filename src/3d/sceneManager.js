import * as THREE from 'three';
import { getPerformanceProfile } from './performance.js';
import { SEASONS } from '../season.js';

/** ORIGEN — Scene Manager v4
 * Cinematic Sierra with synchronized winter/summer atmosphere.
 */
export class SceneManager {
  constructor(canvas){
    this.canvas=canvas;this.scene=null;this.camera=null;this.renderer=null;this.particles=null;this.lights={};this.clock=new THREE.Clock();this.animationCallbacks=[];this.isDisposed=false;this.pedestalGroup=null;this.profile=getPerformanceProfile();this.season='winter';this.backgroundTexture=null;this.init();
  }
  init(){
    this.scene=new THREE.Scene();
    const loader=new THREE.TextureLoader();
    loader.load('/images/origen_panoramic_background.jpg',(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.UVMapping;this.backgroundTexture=texture;this.applySeasonVisuals(this.season,false)},undefined,()=>{this.scene.background=new THREE.Color(0x111318)});
    this.scene.background=new THREE.Color(0x111318);
    this.scene.fog=new THREE.FogExp2(0x617080,0.006);
    const aspect=(this.canvas.clientWidth||window.innerWidth)/(this.canvas.clientHeight||window.innerHeight);
    this.camera=new THREE.PerspectiveCamera(this.profile.mobile?50:42,aspect,.1,100);this.camera.position.set(0,.25,this.profile.mobile?10.4:8.25);this.camera.lookAt(0,-.1,0);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!this.profile.lowPower,powerPreference:'high-performance',alpha:false});
    this.renderer.setSize(this.canvas.clientWidth||window.innerWidth,this.canvas.clientHeight||window.innerHeight,false);this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.shadowMap.enabled=!this.profile.mobile||!this.profile.lowPower;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.setupLighting();this.setupDustParticles();window.addEventListener('resize',this.onWindowResize.bind(this));this.onWindowResize();this.render();
  }
  setupLighting(){
    const ambient=new THREE.AmbientLight(0x9aa4b2,1.05);this.scene.add(ambient);this.lights.ambient=ambient;
    const hemi=new THREE.HemisphereLight(0xb9d0e9,0x4c4039,1.55);hemi.position.set(0,10,0);this.scene.add(hemi);this.lights.hemi=hemi;
    const sun=new THREE.DirectionalLight(0xffd39a,2.7);sun.position.set(5,6,4);sun.castShadow=this.renderer.shadowMap.enabled;sun.shadow.mapSize.width=this.profile.shadowMap;sun.shadow.mapSize.height=this.profile.shadowMap;sun.shadow.camera.near=.5;sun.shadow.camera.far=35;sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.bias=-.0003;this.scene.add(sun);this.lights.sun=sun;
    const rim=new THREE.DirectionalLight(0xabc9ea,1.15);rim.position.set(-5,4,-6);this.scene.add(rim);this.lights.rim=rim;
    const pedestal=new THREE.DirectionalLight(0xffc982,1.7);pedestal.position.set(3,1,5);this.scene.add(pedestal);this.lights.pedestalSun=pedestal;
    const front=new THREE.DirectionalLight(0xffead0,0.7);front.position.set(0,0,6);this.scene.add(front);this.lights.pedestalFront=front;
  }
  setupDustParticles(){
    const count=this.profile.particles,g=new THREE.BufferGeometry(),positions=new Float32Array(count*3),vel=[];
    for(let i=0;i<count;i++){positions[i*3]=(Math.random()-.5)*13;positions[i*3+1]=(Math.random()-.5)*9+1;positions[i*3+2]=(Math.random()-.5)*8;vel.push({x:(Math.random()-.5)*.002,y:Math.random()*.002+.0005,z:(Math.random()-.5)*.002})}
    g.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d'),grad=ctx.createRadialGradient(16,16,0,16,16,16);grad.addColorStop(0,'rgba(255,222,176,1)');grad.addColorStop(.45,'rgba(236,188,120,.35)');grad.addColorStop(1,'rgba(180,140,90,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,32,32);
    this.particles=new THREE.Points(g,new THREE.PointsMaterial({size:this.profile.mobile?.085:.095,map:new THREE.CanvasTexture(c),transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));this.particleVelocities=vel;this.scene.add(this.particles);
  }
  applySeasonVisuals(key='winter',animate=true){
    if(!SEASONS[key])key='winter';this.season=key;document.documentElement.dataset.season=key;
    const palette=key==='summer'?{bg:0x1b120a,fog:0x9a7650,ambient:1.12,hemi:1.3,sun:3.0,rim:0xb8d2ea,pedestal:1.9,front:.8}:{bg:0x111318,fog:0x617080,ambient:1.05,hemi:1.55,sun:2.7,rim:0xabc9ea,pedestal:1.7,front:.7};
    const assign=()=>{if(this.backgroundTexture)this.scene.background=this.backgroundTexture;else this.scene.background=new THREE.Color(palette.bg);this.scene.fog.color.setHex(palette.fog);this.lights.ambient.intensity=palette.ambient;this.lights.hemi.intensity=palette.hemi;this.lights.sun.intensity=palette.sun;this.lights.rim.color.setHex(palette.rim);this.lights.pedestalSun.intensity=palette.pedestal;this.lights.pedestalFront.intensity=palette.front;if(this.particles)this.particles.material.opacity=key==='summer'?0.2:0.28};
    if(!animate||typeof window==='undefined')assign();else{assign();}
  }
  setSeason(key,opts={}){this.applySeasonVisuals(key,opts.animate!==false)}
  updateParticles(){if(!this.particles)return;const p=this.particles.geometry.attributes.position.array;for(let i=0;i<this.particleVelocities.length;i++){const v=this.particleVelocities[i];p[i*3]+=v.x;p[i*3+1]+=v.y;p[i*3+2]+=v.z;if(p[i*3+1]>5.5)p[i*3+1]=-2.5;if(p[i*3]>6.5)p[i*3]=-6.5;if(p[i*3]<-6.5)p[i*3]=6.5}this.particles.geometry.attributes.position.needsUpdate=true}
  onWindowResize(){if(!this.canvas||this.isDisposed)return;const w=this.canvas.clientWidth||window.innerWidth,h=this.canvas.clientHeight||window.innerHeight;this.camera.aspect=w/h;this.camera.fov=w<768?50:42;this.camera.position.z=w<768?10.4:8.25;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.renderer.setPixelRatio(this.profile.pixelRatio)}
  addUpdateCallback(fn){this.animationCallbacks.push(fn)} removeUpdateCallback(fn){this.animationCallbacks=this.animationCallbacks.filter(cb=>cb!==fn)}
  render(){if(this.isDisposed)return;requestAnimationFrame(this.render.bind(this));const d=this.clock.getDelta(),t=this.clock.getElapsedTime();this.updateParticles();if(this.pedestalGroup&&this.pedestalGroup.userData.autoRotateY)this.pedestalGroup.rotation.y+=this.profile.reducedMotion?.0004:this.profile.mobile?.0009:.0012;for(const cb of this.animationCallbacks)cb(d,t);this.renderer.render(this.scene,this.camera)}
  dispose(){this.isDisposed=true;if(this.renderer)this.renderer.dispose()}
}
