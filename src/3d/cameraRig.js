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

    // Posición base: ligeramente elevada para ver las piezas flotando
    this.basePos    = new THREE.Vector3(0, 1.2, 8.2);
    this.baseLookAt = new THREE.Vector3(0, 0.3, 0);
    this.currentLookAt = this.baseLookAt.clone();

    this.isParallaxEnabled = true;
    this.isTransitioning   = false;

    this.bindParallax();
  }

  bindParallax() {
    this.onMouseMove = (e) => {
      if (!this.isParallaxEnabled) return;
      const nx = (e.clientX / window.innerWidth)  * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseTarget.set(nx * 0.4, ny * 0.28);
    };
    // Touch parallax para móvil
    this.onTouchMove = (e) => {
      if (!this.isParallaxEnabled || !e.touches[0]) return;
      const nx = (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
      const ny = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      this.mouseTarget.set(nx * 0.25, ny * 0.18);
    };
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  update() {
    if (!this.isParallaxEnabled || this.isTransitioning) return;
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

    // Retroceso suave + descenso leve para ver el símbolo completo sobre el pedestal
    tl.to(this.camera.position, {
      x: 0, y: 0.8, z: 7.0,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => { this.camera.lookAt(0, 0.4, 0); }
    });

    return tl;
  }

  /**
   * Fly-Through — la cámara pasa por el HUECO INFERIOR del símbolo
   *
   * El arco de la 'Y' (rocky_y.glb) tiene el hueco entre y ≈ -0.3 y y ≈ 0.4.
   * La cámara baja, apunta hacia ese hueco y acaba cruzándolo en Z negativa.
   *
   * Trayectoria:
   *   (0, 0.8, 7.0)  →  (0, -0.2, 3.5)  →  (0, -0.5, -0.5)  →  (0, -0.8, -6)
   *
   * El lookAt sigue el punto de fuga del hueco: (0, -0.4, -10)
   */
  flyThrough(onMidpoint, onFinished) {
    this.isParallaxEnabled = false;
    this.isTransitioning   = true;

    stoneAudio.playWhoosh();

    const tl = gsap.timeline();

    // Fase 1: descenso y enfoque hacia el hueco inferior
    tl.to(this.camera.position, {
      x: 0,
      y: -0.2,  // Bajar para alinearse con el hueco entre las ramas
      z: 3.0,
      duration: 1.0,
      ease: 'power2.in',
      onUpdate: () => { this.camera.lookAt(0, -0.4, -5); }
    }, 0);

    // Fase 2: aceleración y cruce del umbral del arco
    tl.to(this.camera.position, {
      x: 0,
      y: -0.6,  // Continúa bajando — pasando por debajo del nudo central
      z: -2.0,
      duration: 0.85,
      ease: 'power3.in',
      onUpdate: () => { this.camera.lookAt(0, -0.6, -12); }
    }, 0.9);

    // Flash dorado de portal a mitad del vuelo
    tl.call(() => { if (onMidpoint) onMidpoint(); }, null, 1.35);

    // Fase 3: salida al otro lado — desvanecimiento hacia la landing
    tl.to(this.camera.position, {
      x: 0,
      y: -1.2,
      z: -7.0,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => { this.camera.lookAt(0, -1.2, -15); }
    }, 1.6);

    // Finalizar
    tl.call(() => {
      this.isTransitioning = false;
      if (onFinished) onFinished();
    }, null, 2.15);

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
