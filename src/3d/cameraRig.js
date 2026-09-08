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
    if (!this.isParallaxEnabled || this.isTransitioning) {
      // Posición fija y centrada con respecto al pedestal
      this.camera.position.x = this.basePos.x;
      this.camera.position.y = this.basePos.y;
      this.camera.position.z = this.basePos.z;
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

    const tl = gsap.timeline({ onComplete: () => { if (onComplete) onComplete(); } });

    // Retroceso suave y centrado para contemplar el monolito ensamblado
    tl.to(this.camera.position, {
      x: 0, y: 0.85, z: 7.2,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => { this.camera.lookAt(0, 0.35, 0); }
    });

    return tl;
  }

  /**
   * Fly-Through — la cámara pasa por el HUECO INFERIOR del logo (arco central)
   *
   * El arco que forman las ramas izquierda y derecha bajo la clave tiene su centro en:
   * x = 0, y ≈ -0.35, z = 0.
   * La cámara desciende a y = -0.35, apunta al horizonte detrás del arco y vuela
   * en línea recta a través del orificio hacia el atardecer.
   */
  flyThrough(onMidpoint, onFinished) {
    this.isParallaxEnabled = false;
    this.isTransitioning   = true;

    stoneAudio.playWhoosh();

    const tl = gsap.timeline();

    // Fase 1: Descenso directo para alinearse con el hueco del arco
    tl.to(this.camera.position, {
      x: 0,
      y: -0.15,
      z: 2.8,
      duration: 1.1,
      ease: 'power2.inOut',
      onUpdate: () => { this.camera.lookAt(0, -0.15, -10); }
    }, 0);

    // Fase 2: Cruzar exactamente por el hueco inferior entre los pilares de piedra
    tl.to(this.camera.position, {
      x: 0,
      y: -0.15,
      z: -1.5,
      duration: 0.85,
      ease: 'power2.in',
      onUpdate: () => { this.camera.lookAt(0, -0.15, -15); }
    }, 1.0);

    // Destello de portal justo al atravesar el umbral de piedra
    tl.call(() => { if (onMidpoint) onMidpoint(); }, null, 1.45);

    // Fase 3: Salida triunfal hacia el paisaje de la landing
    tl.to(this.camera.position, {
      x: 0,
      y: -0.15,
      z: -8.0,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => { this.camera.lookAt(0, -0.15, -20); }
    }, 1.8);

    // Finalizar transición
    tl.call(() => {
      this.isTransitioning = false;
      if (onFinished) onFinished();
    }, null, 2.3);

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
