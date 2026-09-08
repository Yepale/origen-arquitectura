import * as THREE from 'three';

/**
 * ORIGEN — Scene Manager
 * Configuración de la escena 3D, iluminación cinemática de atardecer,
 * niebla volumétrica, partículas de polvo en suspensión y bucle de render.
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

    this.init();
  }

  init() {
    // 1. Escena con niebla de atardecer y fondo panorámico
    this.scene = new THREE.Scene();
    
    // Cargar la textura de fondo panorámica generada
    const textureLoader = new THREE.TextureLoader();
    const applyTexture = (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = texture;
      this.scene.environment = texture; // Útil para reflejos PBR en las piedras
    };

    textureLoader.load(
      '/images/origen_panoramic_background.jpg',
      applyTexture,
      undefined,
      () => {
        textureLoader.load('/assets/images/origen_panoramic_background.jpg', applyTexture);
      }
    );

    // Fallback de color mientras carga y niebla cálida de atardecer muy sutil
    this.scene.background = new THREE.Color(0x18120e);
    this.scene.fog = new THREE.Fog(0x2c1c14, 14, 50);

    // 2. Cámara cinemática (perspectiva arquitectónica)
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, 1.1, 8.0);
    this.camera.lookAt(0, 0.2, 0);

    // 3. Renderer de alta fidelidad
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
    this.renderer.toneMappingExposure = 1.22;

    // 4. Iluminación arquitectónica cálida (Atardecer en la Sierra)
    this.setupLighting();

    // 5. Partículas de polvo en suspensión (materia viva)
    this.setupDustParticles();

    // 6. Resize listener
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.onWindowResize();

    // 7. Iniciar loop
    this.render();
  }

  setupLighting() {
    // Luz ambiental equilibrada para preservar sombras y textura natural
    const ambientLight = new THREE.AmbientLight(0x3a322c, 1.5);
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;

    // Luz principal rasante de atardecer en la Sierra (cálida dorada)
    const sunLight = new THREE.DirectionalLight(0xffbe7a, 3.2);
    sunLight.position.set(4.8, 4.2, 3.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.camera.left = -6;
    sunLight.shadow.camera.right = 6;
    sunLight.shadow.camera.top = 6;
    sunLight.shadow.camera.bottom = -6;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);
    this.lights.sun = sunLight;

    // Luz de contra / perfilado escultórico para recortar el relieve
    const rimLight = new THREE.DirectionalLight(0x8da0bc, 1.6);
    rimLight.position.set(-5.5, 3.2, -4.0);
    this.scene.add(rimLight);
    this.lights.rim = rimLight;

    // Resplandor cálido proyectado sobre la mesa del pedestal
    const pedestalGlow = new THREE.PointLight(0xffa844, 2.2, 6.5, 1.4);
    pedestalGlow.position.set(0, -1.0, 0.6);
    this.scene.add(pedestalGlow);
    this.lights.pedestal = pedestalGlow;
  }

  setupDustParticles() {
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities.push({
        x: (Math.random() - 0.5) * 0.004,
        y: Math.random() * 0.003 + 0.001,
        z: (Math.random() - 0.5) * 0.004
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Textura circular suave para las partículas
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 230, 180, 1)');
    grad.addColorStop(0.4, 'rgba(230, 190, 130, 0.4)');
    grad.addColorStop(1, 'rgba(200, 160, 100, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: texture,
      transparent: true,
      opacity: 0.45,
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
      positions[i * 3] += v.x;
      positions[i * 3 + 1] += v.y;
      positions[i * 3 + 2] += v.z;

      // Reseteo al salir de los límites
      if (positions[i * 3 + 1] > 4.5) positions[i * 3 + 1] = -2.5;
      if (positions[i * 3] > 6) positions[i * 3] = -6;
      if (positions[i * 3] < -6) positions[i * 3] = 6;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  onWindowResize() {
    if (!this.canvas || this.isDisposed) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    // Adaptar distancia de cámara según formato (móvil vs desktop)
    if (width < 768) {
      this.camera.fov = 52;
      this.camera.position.z = 10.2;
    } else {
      this.camera.fov = 42;
      this.camera.position.z = 8.2;
    }
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  addUpdateCallback(fn) {
    this.animationCallbacks.push(fn);
  }

  removeUpdateCallback(fn) {
    this.animationCallbacks = this.animationCallbacks.filter(cb => cb !== fn);
  }

  render() {
    if (this.isDisposed) return;
    requestAnimationFrame(this.render.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.updateParticles();

    // Ejecutar callbacks registrados (físicas, imán, cámara)
    for (let i = 0; i < this.animationCallbacks.length; i++) {
      this.animationCallbacks[i](delta, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
