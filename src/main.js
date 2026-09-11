import { SceneManager } from './3d/sceneManager.js';
import { buildStonePieces } from './3d/stonePieces.js';
import { InteractionController } from './3d/interaction.js';
import { CameraRig } from './3d/cameraRig.js';
import { MaterialViewer } from './3d/materialViewer.js';
import { stoneAudio } from './audio/stoneAudio.js';
import gsap from 'gsap';

/** ORIGEN — Main Application & State Machine Orchestrator v2 */
class OrigenApp {
  constructor(){
    this.state='INTRO';this.sceneManager=null;this.piecesData=null;this.interaction=null;this.cameraRig=null;this.materialViewer=null;
    this.dom={introExp:document.getElementById('intro-experience'),mainCanvas:document.getElementById('main-canvas'),introUi:document.getElementById('intro-ui'),btnRevive:document.getElementById('btn-revive-intro'),mobileMenuBtn:document.getElementById('mobile-menu-btn'),mobileNav:document.getElementById('mobile-nav'),contactForm:document.getElementById('contact-form'),transitionOverlay:document.getElementById('transition-overlay'),landingPage:document.getElementById('landing-page')};
    this.init();
  }
  init(){
    if(!this.dom.mainCanvas)return;
    this.sceneManager=new SceneManager(this.dom.mainCanvas);
    this.piecesData=buildStonePieces(this.sceneManager.scene);
    this.sceneManager.pedestalGroup=this.piecesData.pedestalGroup;
    this.cameraRig=new CameraRig(this.sceneManager.camera,this.dom.mainCanvas);
    this.interaction=new InteractionController(this.dom.mainCanvas,this.sceneManager.camera,this.piecesData,{onPieceLocked:this.handlePieceLocked.bind(this),onAllLocked:this.handleAllLocked.bind(this)});
    this.sceneManager.addUpdateCallback((delta,time)=>{if(this.state==='INTRO'||this.state==='COMPLETE'){this.interaction.update(delta,time);this.cameraRig.update();}});
    this.setupUIEvents();
  }
  setupUIEvents(){
    const toggleSoundtrack=()=>{stoneAudio.resume();const muted=stoneAudio.toggleMute();document.querySelectorAll('.btn-soundtrack').forEach(btn=>{const on=btn.querySelector('.icon-sound-on'),off=btn.querySelector('.icon-sound-off');btn.classList.toggle('muted',muted);btn.setAttribute('aria-pressed',String(muted));if(on)on.style.display=muted?'none':'';if(off)off.style.display=muted?'':'none';});};
    document.getElementById('btn-soundtrack-toggle')?.addEventListener('click',toggleSoundtrack);
    document.getElementById('header-soundtrack-toggle')?.addEventListener('click',toggleSoundtrack);
    this.dom.btnRevive?.addEventListener('click',e=>{e.preventDefault();this.reviveIntro()});
    if(this.dom.mobileMenuBtn&&this.dom.mobileNav){this.dom.mobileMenuBtn.addEventListener('click',()=>{const open=this.dom.mobileNav.classList.toggle('active');this.dom.mobileMenuBtn.classList.toggle('active',open);this.dom.mobileMenuBtn.setAttribute('aria-expanded',String(open));});this.dom.mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{this.dom.mobileNav.classList.remove('active');this.dom.mobileMenuBtn.classList.remove('active');this.dom.mobileMenuBtn.setAttribute('aria-expanded','false')}));}
    this.dom.contactForm?.addEventListener('submit',e=>{e.preventDefault();const btn=document.getElementById('btn-submit-form');if(!btn)return;btn.disabled=true;btn.textContent='ENVIANDO...';setTimeout(()=>{btn.textContent='MENSAJE ENVIADO CON ÉXITO';this.dom.contactForm.reset();setTimeout(()=>{btn.disabled=false;btn.textContent='ENVIAR MENSAJE'},2500)},800)});
    document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const href=a.getAttribute('href');if(!href||href==='#')return;const target=document.querySelector(href);if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}));
  }
  handlePieceLocked(pieceName,totalLocked){document.dispatchEvent(new CustomEvent('origen:piece-locked',{detail:{pieceName,totalLocked}}));}
  handleAllLocked(){
    this.state='COMPLETE';
    gsap.to(this.dom.introUi,{opacity:0,duration:.7,ease:'power2.out',pointerEvents:'none'});
    this.cameraRig.focusCompletedSymbol(()=>setTimeout(()=>this.startFlyThrough(),900));
  }
  startFlyThrough(){
    this.state='FLY_THROUGH';
    this.cameraRig.flyThrough(()=>{if(this.dom.transitionOverlay){gsap.to(this.dom.transitionOverlay,{opacity:1,duration:.4,ease:'power2.in',onComplete:()=>this.showLandingPage()})}else this.showLandingPage()},()=>{if(this.dom.transitionOverlay)gsap.to(this.dom.transitionOverlay,{opacity:0,duration:.85,ease:'power2.out'})});
  }
  showLandingPage(){
    this.state='LANDING';
    if(this.dom.introExp)this.dom.introExp.style.display='none';
    if(this.dom.landingPage){this.dom.landingPage.classList.add('visible');this.dom.landingPage.setAttribute('aria-hidden','false');window.scrollTo(0,0);if(!this.materialViewer)this.materialViewer=new MaterialViewer('viewer-canvas');}
  }
  reviveIntro(){
    this.state='INTRO';
    if(this.dom.landingPage){this.dom.landingPage.classList.remove('visible');this.dom.landingPage.setAttribute('aria-hidden','true');}
    if(this.dom.introExp)this.dom.introExp.style.display='block';
    if(this.dom.introUi){this.dom.introUi.style.opacity='1';this.dom.introUi.style.pointerEvents='auto';}
    Object.values(this.piecesData.pieces).forEach(p=>{p.isLocked=false;p.isDragging=false;p.group.position.copy(p.initialPos);p.group.rotation.copy(p.initialRot);if(p.ghost)p.ghost.visible=false;if(p.glowMesh)p.glowMesh.visible=false;});
    this.interaction.lockedCount=0;this.interaction.isCompleted=false;this.cameraRig.resetToIntro();
  }
}
window.addEventListener('DOMContentLoaded',()=>new OrigenApp());
