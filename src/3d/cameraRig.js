import * as THREE from 'three';
import gsap from 'gsap';
import { stoneAudio } from '../audio/stoneAudio.js';

/**
 * ORIGEN — Camera Rig & Cinematic Transitions
 * Controla el paralaje arquitectónico de cámara, el reencuadre dramático
 * al completar el símbolo y el vuelo cinemático (fly-through) a través del arco.
 */

export class CameraRig {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    this.mouseTarget = new THREE.Vector2(0, 0);
    this.mouseCurrent = new THREE.Vector2(0, 0);

    this.basePos = new THREE.Vector3(0, 1.2, 8.2);
    this.baseLookAt = new THREE.Vector3(0, 0.2, 0);
    this.currentLookAt = this.baseLookAt.clone();

    this.isParallaxEnabled = true;
    this.isTransitioning = false;

    this.bindParallax();
  }

  bindParallax() {
    this.onMouseMove = (e) => {
      if (!this.isParallaxEnabled) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseTarget.set(nx * 0.45, ny * 0.35);
    };

    window.addEventListener('mousemove', this.onMouseMove);
  }

  update() {
    if (!this.isParallaxEnabled || this.isTransitioning) return;

    this.mouseCurrent.lerp(this.mouseTarget, 0.05);

    this.camera.position.x = this.basePos.x + this.mouseCurrent.x;
    this.camera.position.y = this.basePos.y + this.mouseCurrent.y;
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Clímax: Ligero reencuadre majestuoso para contemplar el monolito sellado
   */
  focusCompletedSymbol(onComplete) {
    this.isParallaxEnabled = false;
    this.isTransitioning = true;

    // Timeline cinemática
    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // Retroceso ligero y elevación épica
    tl.to(this.camera.position, {
      x: 0,
      y: 1.0,
      z: 7.4,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.camera.lookAt(0, 0.3, 0);
      }
    });

    return tl;
  }

  /**
   * Vuelo a través del símbolo (Fly-Through Portal)
   * La cámara acelera hacia adelante, atraviesa el hueco central de la 'Y'
   * y se funde con el resplandor de la Landing Page
   */
  flyThrough(onMidpoint, onFinished) {
    this.isParallaxEnabled = false;
    this.isTransitioning = true;

    stoneAudio.playWhoosh();

    const tl = gsap.timeline();

    // 1. Ligera pausa y aceleración hipersuave
    tl.to(this.camera.position, {
      x: 0,
      y: 0.7, // Altura exacta del hueco del símbolo
      z: -3.5, // Atraviesa el símbolo (z=0) hacia el fondo
      duration: 1.7,
      ease: 'power3.in',
      onUpdate: () => {
        this.camera.lookAt(0, 0.7, -10);
      }
    }, 0);

    // 2. Disparo de blur / flash blanco a mitad de camino
    tl.call(() => {
      if (onMidpoint) onMidpoint();
    }, null, 1.0);

    // 3. Finalización y callback
    tl.call(() => {
      this.isTransitioning = false;
      if (onFinished) onFinished();
    }, null, 1.75);

    return tl;
  }

  /**
   * Reset para revivir la intro
   */
  resetToIntro() {
    this.isTransitioning = false;
    this.camera.position.copy(this.basePos);
    this.camera.lookAt(this.baseLookAt);
    this.currentLookAt.copy(this.baseLookAt);
    this.isParallaxEnabled = true;
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
  }
}
