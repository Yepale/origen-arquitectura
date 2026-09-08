import * as THREE from 'three';
import gsap from 'gsap';
import { stoneAudio } from '../audio/stoneAudio.js';

/**
 * ORIGEN — 3D Interaction & Physics Controller
 * Gestiona el raycasting, arrastre táctil y con ratón,
 * efecto de imán estructural con física de muelle y retroceso suave.
 */

export class InteractionController {
  constructor(canvas, camera, piecesData, callbacks = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.pieces = piecesData.pieces;
    this.symbolGroup = piecesData.symbolGroup;
    this.callbacks = callbacks; // onPieceLocked, onAllLocked, onDragStart, onDragEnd

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.planeIntersect = new THREE.Vector3();

    this.selectedPiece = null;
    this.isDragging = false;
    this.dragOffset = new THREE.Vector3();
    this.initialPointerPos = new THREE.Vector2();

    this.snapDistance = 1.45; // Distancia para iniciar atracción magnética
    this.lockDistance = 0.85; // Distancia para encajar definitivamente

    this.lockedCount = 0;
    this.isCompleted = false;

    // Elementos interactuables para raycast
    this.pickableMeshes = [];
    Object.values(this.pieces).forEach(p => {
      this.pickableMeshes.push(p.mesh);
    });

    this.bindEvents();
  }

  bindEvents() {
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  updatePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getPickableRoots() {
    return Object.values(this.pieces).map(p => p.group);
  }

  handlePointerDown(e) {
    if (this.isCompleted) return;
    this.updatePointer(e);
    this.initialPointerPos.copy(this.pointer);

    stoneAudio.resume();

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.getPickableRoots(), true);

    // Filtrar ghosts y glows
    const validIntersects = intersects.filter(hit => {
      return !hit.object.name.startsWith('ghost') && !hit.object.name.startsWith('glow');
    });

    if (validIntersects.length > 0) {
      // Localizar pieza asociada
      let hitMesh = validIntersects[0].object;
      let pieceName = null;

      while (hitMesh) {
        if (hitMesh.userData && hitMesh.userData.pieceName) {
          pieceName = hitMesh.userData.pieceName;
          break;
        }
        if (hitMesh.name && hitMesh.name.startsWith('piece_')) {
          pieceName = hitMesh.name.replace('piece_', '');
          break;
        }
        hitMesh = hitMesh.parent;
      }

      const piece = this.pieces[pieceName];

      if (piece && !piece.isLocked) {
        this.selectedPiece = piece;
        this.isDragging = true;
        piece.isDragging = true;
        gsap.killTweensOf(piece.group.position);
        gsap.killTweensOf(piece.group.rotation);

        // Definir plano de arrastre paralelo a la cámara a la profundidad de la pieza
        const normal = new THREE.Vector3();
        this.camera.getWorldDirection(normal).negate();
        this.dragPlane.setFromNormalAndCoplanarPoint(normal, piece.group.position);

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
          this.dragOffset.copy(piece.group.position).sub(this.planeIntersect);
        }

        // Sensación táctil de alzar bloque de piedra pesado (ligero lift en Z)
        gsap.to(piece.group.position, {
          z: piece.group.position.z + 0.25,
          duration: 0.18,
          ease: 'power2.out'
        });

        // Sonido de levantamiento de piedra
        stoneAudio.playPick();

        this.canvas.style.cursor = 'grabbing';

        if (this.callbacks.onDragStart) {
          this.callbacks.onDragStart(pieceName);
        }
      }
    }
  }

  handlePointerMove(e) {
    if (!this.isDragging || !this.selectedPiece) {
      // Hover feedback sobre piezas no bloqueadas
      this.updatePointer(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.getPickableRoots(), true);
      const valid = intersects.filter(h => !h.object.name.startsWith('ghost') && !h.object.name.startsWith('glow'));
      let foundUnlocked = false;
      if (valid.length > 0) {
        let obj = valid[0].object;
        while (obj) {
          if (obj.userData?.pieceName && !this.pieces[obj.userData.pieceName]?.isLocked) {
            foundUnlocked = true;
            break;
          }
          obj = obj.parent;
        }
      }
      this.canvas.style.cursor = foundUnlocked ? 'grab' : 'default';
      return;
    }

    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
      const targetCoord = this.planeIntersect.clone().add(this.dragOffset);

      const piece = this.selectedPiece;
      const distToTarget = targetCoord.distanceTo(piece.targetPos);

      // Efecto de Imán Estructural (Magnetic Snap progresivo)
      if (distToTarget < this.snapDistance) {
        // Atracción con desaceleración hacia el hueco de encaje
        const factor = 1 - (distToTarget / this.snapDistance);
        targetCoord.lerp(piece.targetPos, factor * 0.72);

        // Orientación se alinea progresivamente con el encaje
        piece.group.rotation.x = THREE.MathUtils.lerp(piece.group.rotation.x, piece.targetRot.x, factor * 0.55);
        piece.group.rotation.y = THREE.MathUtils.lerp(piece.group.rotation.y, piece.targetRot.y, factor * 0.55);
        piece.group.rotation.z = THREE.MathUtils.lerp(piece.group.rotation.z, piece.targetRot.z, factor * 0.55);

        // Destacar guía fantasma
        if (piece.ghost) {
          piece.ghost.material.opacity = 0.55;
        }

        if (!piece.inMagnetZone) {
          piece.inMagnetZone = true;
          stoneAudio.playMagnetSnap();
        }
      } else {
        piece.inMagnetZone = false;
        if (piece.ghost) {
          piece.ghost.material.opacity = 0.18;
        }
      }

      // Desplazamiento con leve inercia
      piece.group.position.lerp(targetCoord, 0.45);
    }
  }

  handlePointerUp() {
    if (!this.isDragging || !this.selectedPiece) return;

    const piece = this.selectedPiece;
    piece.isDragging = false;
    this.isDragging = false;
    this.selectedPiece = null;
    this.canvas.style.cursor = 'default';

    const distToTarget = piece.group.position.distanceTo(piece.targetPos);

    if (distToTarget < this.lockDistance || piece.inMagnetZone) {
      // ENCAJE EXITOSO con microimpacto
      this.lockPiece(piece);
    } else {
      // RETORNO SUAVE AL ORIGEN (No encajó)
      this.returnPieceToInitial(piece);
    }

    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd(piece.name);
    }
  }

  lockPiece(piece, silent = false) {
    if (piece.isLocked) return;
    piece.isLocked = true;
    piece.inMagnetZone = false;

    // Desaceleración suave, alineación de ángulo y micro-impacto elástico (sin teleport instantáneo)
    gsap.killTweensOf(piece.group.position);
    gsap.killTweensOf(piece.group.rotation);

    gsap.to(piece.group.position, {
      x: piece.targetPos.x,
      y: piece.targetPos.y,
      z: piece.targetPos.z,
      duration: 0.52,
      ease: 'power2.out',
      onComplete: () => {
        // Asentamiento sutil y noble de cantería
        gsap.to(piece.group.position, {
          y: piece.targetPos.y - 0.016,
          duration: 0.12,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut'
        });
      }
    });

    gsap.to(piece.group.rotation, {
      x: piece.targetRot.x,
      y: piece.targetRot.y,
      z: piece.targetRot.z,
      duration: 0.52,
      ease: 'power2.out'
    });

    // Ocultar guía fantasma
    if (piece.ghost) {
      piece.ghost.visible = false;
    }

    // Efecto de pulso dorado sutil en la junta
    if (piece.glowMesh) {
      piece.glowMesh.visible = true;
      gsap.fromTo(piece.glowMesh.material, { opacity: 0.8 }, { opacity: 0, duration: 0.9, ease: 'power1.out', onComplete: () => { piece.glowMesh.visible = false; } });
    }

    // Sonido distintivo de cantería
    if (!silent) {
      stoneAudio.playLock(piece.name);
    }

    this.lockedCount++;

    if (this.callbacks.onPieceLocked) {
      this.callbacks.onPieceLocked(piece.name, this.lockedCount);
    }

    // Comprobar si se ha completado el símbolo
    if (this.lockedCount >= 3 && !this.isCompleted) {
      this.isCompleted = true;
      if (!silent) {
        setTimeout(() => {
          stoneAudio.playCompletion();
        }, 150);
      }
      if (this.callbacks.onAllLocked) {
        this.callbacks.onAllLocked();
      }
    }
  }

  returnPieceToInitial(piece) {
    gsap.killTweensOf(piece.group.position);
    gsap.killTweensOf(piece.group.rotation);

    gsap.to(piece.group.position, {
      x: piece.initialPos.x,
      y: piece.initialPos.y,
      z: piece.initialPos.z,
      duration: 0.55,
      ease: 'power2.out'
    });

    gsap.to(piece.group.rotation, {
      x: piece.initialRot.x,
      y: piece.initialRot.y,
      z: piece.initialRot.z,
      duration: 0.55,
      ease: 'power2.out'
    });

    // Ghost invisible — escena limpia, sin marcadores de destino
  }

  /**
   * Autocompletar / skip para accesibilidad o botón directo
   */
  autoCompleteAll() {
    const pieceOrder = ['tierra', 'tiempo', 'mano'];
    pieceOrder.forEach((name, idx) => {
      const piece = this.pieces[name];
      if (piece && !piece.isLocked) {
        setTimeout(() => {
          this.lockPiece(piece);
        }, idx * 280);
      }
    });
  }

  /**
   * Actualización por frame: flotación idle y retorno suave
   */
  update(delta, time) {
    Object.values(this.pieces).forEach(piece => {
      if (piece.isLocked) return;

      if (piece.isReturning) {
        // Interpolar hacia posición y rotación inicial
        piece.group.position.lerp(piece.initialPos, 0.12);
        piece.group.rotation.x = THREE.MathUtils.lerp(piece.group.rotation.x, piece.initialRot.x, 0.12);
        piece.group.rotation.y = THREE.MathUtils.lerp(piece.group.rotation.y, piece.initialRot.y, 0.12);
        piece.group.rotation.z = THREE.MathUtils.lerp(piece.group.rotation.z, piece.initialRot.z, 0.12);

        if (piece.group.position.distanceTo(piece.initialPos) < 0.05) {
          piece.group.position.copy(piece.initialPos);
          piece.group.rotation.copy(piece.initialRot);
          piece.isReturning = false;
        }
      } else if (!piece.isDragging) {
        // Flotación arquitectónica sutil de las piezas separadas
        const floatY = Math.sin(time * 1.4 + piece.idleFloatOffset) * 0.06;
        const rotY = Math.sin(time * 0.9 + piece.idleFloatOffset) * 0.03;
        piece.group.position.y = piece.initialPos.y + floatY;
        piece.group.rotation.y = piece.initialRot.y + rotY;
      }
    });
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}
