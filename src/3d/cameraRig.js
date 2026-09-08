import * as THREE from 'three';
import gsap from 'gsap';
import { stoneAudio } from '../audio/stoneAudio.js';

/**
 * ORIGEN — Camera Rig & Cinematic Transitions
 *
 * El vuelo final pasa por el HUECO INFERIOR del logo — el arco que forman
 * las dos ramas (TIERRA y MANO) al unirse con la clave (TIEMPO).
 * En el modelo rocky_y.glb, ese hueco está aproximadamente en Y ≈ -0.4
 * (entre la mesa del pedestal y el nudo central del símbolo).
 */

export class CameraRig {
  constructor(camera, canvas) {
    this.camera  = camera;
    this.canvas  = canvas;

    this.mouseTarget  = new THREE.Vector2(0, 0);
    this.mouseCurrent = new THREE.Vector2(0, 0);

    // Posición base cinemática: encuadra pedestal con sus relieves y piedras flotantes
    this.basePos    = new THREE.Vector3(0, 0.20, 8.0);
    this.baseLookAt = new THREE.Vector3(0, -0.25, 0);
    this.currentLookAt = this.baseLookAt.clone();

    // Parallax desactivado en la intro para que el pedestal solo gire 360° sobre su eje Y sin tambalearse
    this.isParallaxEnabled = false;
    this.isTransitioning   = false;

    this.bindParallax();
  }

  bindParallax() {
    this.onMouseMove = (e) => {
      if (!this.isParallaxEnabled) return;
      const nx = (e.clientX / window.innerWidth)  * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseTarget.set(nx * 0.15, ny * 0.1);
    };
    this.onTouchMove = (e) => {
      if (!this.isParallaxEnabled || !e.touches[0]) return;
      const nx = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
      const ny = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      this.mouseTarget.set(nx * 0.1, ny * 0.08);
    };
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  update() {
    // Si la cámara está en una transición cinemática (GSAP), no sobreescribir su posición
    if (this.isTransitioning) {
      return;
    }

    if (!this.isParallaxEnabled) {
      // Posición fija y centrada con respecto al pedestal
      this.camera.position.copy(this.basePos);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    this.mouseCurrent.lerp(this.mouseTarget, 0.05);
    this.camera.position.x = this.basePos.x + this.mouseCurrent.x;
    this.camera.position.y = this.basePos.y + this.mouseCurrent.y;
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Reencuadre majestuoso al completar el símbolo
   */
  focusCompletedSymbol(onComplete) {
    this.isParallaxEnabled = false;
    this.isTransitioning   = true;

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // Elevación suave para contemplar el monolito ensamblado
    tl.to(this.camera.position, {
      x: 0,
      y: 0.70,
      z: 7.4,
      duration: 2.0,
      ease: 'power2.inOut',
    }, 0);

    // Interpolación continua y suave del punto de mira
    tl.to(this.currentLookAt, {
      x: 0,
      y: 0.10,
      z: 0,
      duration: 2.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(this.currentLookAt);
      }
    }, 0);

    return tl;
  }

  /**
   * Fly-Through — vuelo cinemático continuo a través del arco central del logo
   */
  flyThrough(onMidpoint, onFinished) {
    this.isParallaxEnabled = false;
    this.isTransitioning   = true;

    stoneAudio.playWhoosh();

    const tl = gsap.timeline();

    // Vuelo fluido y continuo sin cambios bruscos de aceleración ni de lookAt
    tl.to(this.camera.position, {
      x: 0,
      y: -0.22,
      z: -7.0,
      duration: 2.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(this.currentLookAt);
      }
    }, 0);

    tl.to(this.currentLookAt, {
      x: 0,
      y: -0.22,
      z: -18.0,
      duration: 2.6,
      ease: 'power2.inOut',
    }, 0);

    // Destello de portal al atravesar el arco del monolito (z ≈ 0)
    tl.call(() => {
      if (onMidpoint) onMidpoint();
    }, null, 1.3);

    // Finalizar transición cinemática
    tl.call(() => {
      this.isTransitioning = false;
      if (onFinished) onFinished();
    }, null, 2.7);

    return tl;
  }

  resetToIntro() {
    this.isTransitioning   = false;
    this.camera.position.copy(this.basePos);
    this.camera.lookAt(this.baseLookAt);
    this.currentLookAt.copy(this.baseLookAt);
    this.isParallaxEnabled = true;
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
  }
}
