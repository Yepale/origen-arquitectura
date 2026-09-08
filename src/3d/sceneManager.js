import * as THREE from 'three';

/**
 * ORIGEN — Scene Manager
 * Fondo panorámico de paisaje real, iluminación cinemática de atardecer,
 * partículas de polvo en suspensión y bucle de render.
 */

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.lights = {};
    this.clock = new THREE.Clock();
    this.animationCallbacks = [];
    this.isDisposed = false;
    this.pedestalGroup = null; // Referencia para rotación solo en Y

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    // ── Fondo: textura 2D directa (no equirectangular) ──────────────────────
    // Se usa como background plano para que el paisaje se vea completo y nítido
    const textureLoader = new THREE.TextureLoader();

    const applyBackground = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Mantener relación de aspecto cubriendo toda la pantalla (como CSS cover)
      texture.mapping = THREE.UVMapping;
      this.scene.background = texture;
      this.scene.backgroundBlurriness = 0.0;
      // Leve tinte de ambiente que saca color del paisaje hacia las piedras
      this.scene.environment = null;
    };

    // Intentar rutas en orden de prioridad
    textureLoader.load(
      '/images/origen_panoramic_background.jpg',
      applyBackground,
      undefined,
      () => {
        textureLoader.load('/images/origen_panoramic_background.jpg', applyBackground, undefined, () => {
          // Fallback: color oscuro cálido de atardecer
          this.scene.background = new THREE.Color(0x1a1108);
        });
      }
    );

    // Color inicial mientras carga
    this.scene.background = new THREE.Color(0x1a1108);

    // Niebla muy sutil — sólo para dar profundidad a objetos lejanos, no oculta fondo
    this.scene.fog = new THREE.FogExp2(0x2a1a0e, 0.018);

    // ── Cámara cinemática ────────────────────────────────────────────────────
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.set(0, 0.20, 8.0);
    this.camera.lookAt(0, -0.25, 0);

    // ── Renderer de alta fidelidad ───────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.setupLighting();
    this.setupDustParticles();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.onWindowResize();
    this.render();
  }

  setupLighting() {
    // Luz ambiental neutra cálida — revela los detalles de la roca sin lavar los colores
    const ambientLight = new THREE.AmbientLight(0x8a7f72, 1.25);
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;

    // Luz hemisférica: cielo cálido arriba, rebote de tierra abajo
    const hemiLight = new THREE.HemisphereLight(0xb0c8e0, 0x6a5440, 1.4);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);
    this.lights.hemi = hemiLight;

    // Luz solar dorada de atardecer rasante
    const sunLight = new THREE.DirectionalLight(0xffedd2, 2.2);
    sunLight.position.set(5.5, 4.0, 4.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -7;
    sunLight.shadow.camera.right = 7;
    sunLight.shadow.camera.top = 7;
    sunLight.shadow.camera.bottom = -7;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);
    this.lights.sun = sunLight;

    // Contra-luz sutil para perfilar siluetas
    const rimLight = new THREE.DirectionalLight(0x9ab8dc, 1.0);
    rimLight.position.set(-6, 3, -5);
    this.scene.add(rimLight);
    this.lights.rim = rimLight;

    // Luz solar cálida dedicada al pedestal: baña el tambor esculpido revelando sus relieves
    const pedestalSun = new THREE.DirectionalLight(0xffdfb2, 1.5);
    pedestalSun.position.set(3.2, 0.2, 4.5);
    this.scene.add(pedestalSun);
    this.lights.pedestalSun = pedestalSun;

    // Luz frontal suave de relleno para los bajorrelieves
    const pedestalFront = new THREE.DirectionalLight(0xffeedd, 0.85);
    pedestalFront.position.set(0, -0.6, 5.5);
    this.scene.add(pedestalFront);
    this.lights.pedestalFront = pedestalFront;
  }

  setupDustParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities.push({
        x: (Math.random() - 0.5) * 0.003,
        y: Math.random() * 0.0025 + 0.0008,
        z: (Math.random() - 0.5) * 0.003
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 210, 150, 1)');
    grad.addColorStop(0.5, 'rgba(220, 170, 100, 0.3)');
    grad.addColorStop(1, 'rgba(180, 130, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: texture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.particleVelocities = velocities;
    this.scene.add(this.particles);
  }

  updateParticles() {
    if (!this.particles) return;
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleVelocities.length; i++) {
      const v = this.particleVelocities[i];
      positions[i * 3]     += v.x;
      positions[i * 3 + 1] += v.y;
      positions[i * 3 + 2] += v.z;

      if (positions[i * 3 + 1] > 5)  positions[i * 3 + 1] = -3;
      if (positions[i * 3]     > 7)  positions[i * 3]     = -7;
      if (positions[i * 3]     < -7) positions[i * 3]     =  7;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  onWindowResize() {
    if (!this.canvas || this.isDisposed) return;
    const width  = this.canvas.clientWidth  || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    if (width < 768) {
      this.camera.fov = 52;
      this.camera.position.z = 10.5;
    } else {
      this.camera.fov = 42;
      this.camera.position.z = 8.2;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  addUpdateCallback(fn)    { this.animationCallbacks.push(fn); }
  removeUpdateCallback(fn) { this.animationCallbacks = this.animationCallbacks.filter(cb => cb !== fn); }

  render() {
    if (this.isDisposed) return;
    requestAnimationFrame(this.render.bind(this));

    const delta       = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.updateParticles();

    // Rotación suave del pedestal solo sobre el eje Y (sin tambalear)
    if (this.pedestalGroup && this.pedestalGroup.userData.autoRotateY) {
      this.pedestalGroup.rotation.y += 0.0018;
    }

    // Ejecutar callbacks registrados (físicas, imán, cámara)
    for (let i = 0; i < this.animationCallbacks.length; i++) {
      this.animationCallbacks[i](delta, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer) this.renderer.dispose();
  }
}
