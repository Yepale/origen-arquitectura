import * as THREE from 'three';
import gsap from 'gsap';
import { stoneAudio } from '../audio/stoneAudio.js';

/** ORIGEN — interaction on invisible semantic proxies; master GLB remains visually intact. */
export class InteractionController {
  constructor(canvas,camera,piecesData,callbacks={}){
    this.canvas=canvas;this.camera=camera;this.pieces=piecesData.pieces;this.symbolGroup=piecesData.symbolGroup;this.callbacks=callbacks;
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.dragPlane=new THREE.Plane();this.planeIntersect=new THREE.Vector3();
    this.selectedPiece=null;this.isDragging=false;this.dragOffset=new THREE.Vector3();this.lockedCount=0;this.isCompleted=false;this.bindEvents();
  }
  bindEvents(){this.onPointerDown=this.handlePointerDown.bind(this);this.onPointerMove=this.handlePointerMove.bind(this);this.onPointerUp=this.handlePointerUp.bind(this);this.canvas.addEventListener('pointerdown',this.onPointerDown);window.addEventListener('pointermove',this.onPointerMove);window.addEventListener('pointerup',this.onPointerUp);window.addEventListener('pointercancel',this.onPointerUp);}
  updatePointer(e){const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;}
  getPickableRoots(){return Object.values(this.pieces).map(p=>p.group).filter(Boolean);}
  handlePointerDown(e){
    if(this.isCompleted)return;this.updatePointer(e);stoneAudio.resume();this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.getPickableRoots(),true);let hit=hits[0]?.object,pieceName=hit?.userData?.pieceName;
    if(!pieceName&&hit){let o=hit;while(o&&!pieceName){pieceName=o.userData?.pieceName||null;o=o.parent;}}
    const piece=this.pieces[pieceName];if(!piece||piece.isLocked)return;
    this.selectedPiece=piece;this.isDragging=true;piece.isDragging=true;gsap.killTweensOf(piece.group.position);gsap.killTweensOf(piece.group.rotation);
    const normal=new THREE.Vector3();this.camera.getWorldDirection(normal).negate();this.dragPlane.setFromNormalAndCoplanarPoint(normal,piece.group.position);
    if(this.raycaster.ray.intersectPlane(this.dragPlane,this.planeIntersect))this.dragOffset.copy(piece.group.position).sub(this.planeIntersect);
    this.canvas.style.cursor='grabbing';stoneAudio.playPick();this.callbacks.onDragStart?.(pieceName);
  }
  handlePointerMove(e){
    if(!this.isDragging||!this.selectedPiece){this.canvas.style.cursor='default';return;}
    this.updatePointer(e);this.raycaster.setFromCamera(this.pointer,this.camera);if(!this.raycaster.ray.intersectPlane(this.dragPlane,this.planeIntersect))return;
    const piece=this.selectedPiece,target=this.planeIntersect.clone().add(this.dragOffset),dist=target.distanceTo(piece.targetPos);
    if(dist<1.25){const f=1-dist/1.25;target.lerp(piece.targetPos,f*.8);piece.group.rotation.x=THREE.MathUtils.lerp(piece.group.rotation.x,piece.targetRot.x,f*.5);piece.group.rotation.y=THREE.MathUtils.lerp(piece.group.rotation.y,piece.targetRot.y,f*.5);piece.group.rotation.z=THREE.MathUtils.lerp(piece.group.rotation.z,piece.targetRot.z,f*.5);piece.inMagnetZone=true;}else piece.inMagnetZone=false;
    piece.group.position.lerp(target,.5);
  }
  handlePointerUp(){
    if(!this.isDragging||!this.selectedPiece)return;const piece=this.selectedPiece;piece.isDragging=false;this.isDragging=false;this.selectedPiece=null;this.canvas.style.cursor='default';
    const dist=piece.group.position.distanceTo(piece.targetPos);if(dist<.8||piece.inMagnetZone)this.lockPiece(piece);else this.returnPieceToInitial(piece);this.callbacks.onDragEnd?.(piece.name);
  }
  lockPiece(piece,silent=false){
    if(piece.isLocked)return;piece.isLocked=true;piece.inMagnetZone=false;gsap.killTweensOf(piece.group.position);gsap.killTweensOf(piece.group.rotation);
    gsap.to(piece.group.position,{x:piece.targetPos.x,y:piece.targetPos.y,z:piece.targetPos.z,duration:.52,ease:'power2.out'});gsap.to(piece.group.rotation,{x:piece.targetRot.x,y:piece.targetRot.y,z:piece.targetRot.z,duration:.52,ease:'power2.out'});
    if(!silent)stoneAudio.playLock(piece.name);this.lockedCount++;this.callbacks.onPieceLocked?.(piece.name,this.lockedCount);
    if(this.lockedCount>=3&&!this.isCompleted){this.isCompleted=true;if(!silent)setTimeout(()=>stoneAudio.playCompletion(),150);this.callbacks.onAllLocked?.();}
  }
  returnPieceToInitial(piece){gsap.killTweensOf(piece.group.position);gsap.killTweensOf(piece.group.rotation);gsap.to(piece.group.position,{x:piece.initialPos.x,y:piece.initialPos.y,z:piece.initialPos.z,duration:.55,ease:'power2.out'});gsap.to(piece.group.rotation,{x:piece.initialRot.x,y:piece.initialRot.y,z:piece.initialRot.z,duration:.55,ease:'power2.out'});}
  autoCompleteAll(){['tierra','tiempo','mano'].forEach((name,i)=>{const p=this.pieces[name];if(p&&!p.isLocked)setTimeout(()=>this.lockPiece(p),i*280);});}
  update(){}
  destroy(){this.canvas.removeEventListener('pointerdown',this.onPointerDown);window.removeEventListener('pointermove',this.onPointerMove);window.removeEventListener('pointerup',this.onPointerUp);window.removeEventListener('pointercancel',this.onPointerUp);}
}
