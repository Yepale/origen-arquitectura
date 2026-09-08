import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createStoneMaterials } from './stonePieces.js';

/**
 * ORIGEN — Material Viewer (Visor 3D de Materiales en la Landing Page)
 * Carga el modelo 3D monolítico stone_y.glb y permite rotar interactivamente
 * y cambiar en tiempo real entre los acabados nobles:
 * Caliza, Bronce, Pizarra y Hierro Fundido.
 */

export class MaterialViewer {
  constructor(canvasId = 'viewer-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.symbolMesh = null;
    this.materials = null;
    this.currentMaterialKey = 'caliza';
    this.gltfMesh = null;

    // Rotación e interacción
    this.isPointerDown = false;
    this.previousPointerPosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0.1, y: 0.3 };

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 600;
    const height = this.canvas.clientHeight || 500;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.set(0, 0.2, 5.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // Luces de estudio arquitectónico
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xffecd0, 2.4);
    keyLight.position.set(4, 5, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8fa2ba, 1.2);
    fillLight.position.set(-4, -2, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd290, 1.6);
    rimLight.position.set(0, 4, -4);
    this.scene.add(rimLight);

    this.materials = createStoneMaterials();

    this.buildMonolith();

    this.bindControls();
    this.bindButtons();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  buildMonolith() {
    this.symbolMesh = new THREE.Group();
    this.scene.add(this.symbolMesh);

    // Cargar modelo 3D monolítico stone_y.glb
    const loader = new GLTFLoader();
    loader.load(
      '/models/stone_y.glb',
      (gltf) => {
        const model = gltf.scene;
        const mat = this.materials[this.currentMaterialKey];

        model.traverse((child) => {
          if (child.isMesh) {
            this.gltfMesh = child;
            child.material = mat;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Escalar y centrar el monolito
        model.scale.set(3.4, 3.4, 3.4);
        model.position.set(0, -1.65, 0);

        this.symbolMesh.clear();
        this.symbolMesh.add(model);
      },
      undefined,
      (err) => {
        console.warn('Fallback geometría procedimental en visor:', err);
        this.buildProceduralFallback();
      }
    );
  }

  buildProceduralFallback() {
    const leftShape = new THREE.Shape();
    leftShape.moveTo(-0.15, -1.8);
    leftShape.lineTo(-0.85, -1.8);
    leftShape.lineTo(-0.85, -0.4);
    leftShape.lineTo(-1.6, 1.3);
    leftShape.lineTo(-0.8, 1.7);
    leftShape.lineTo(-0.15, 0.3);
    leftShape.closePath();

    const extrudeSettings = {
      depth: 0.6,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.055
    };

    const gLeft = new THREE.ExtrudeGeometry(leftShape, extrudeSettings);
    gLeft.center();
    const mat = this.materials[this.currentMaterialKey];
    const mesh = new THREE.Mesh(gLeft, mat);
    this.symbolMesh.add(mesh);
  }

  setMaterial(key) {
    if (!this.materials[key]) return;
    this.currentMaterialKey = key;
    const newMat = this.materials[key];

    if (this.gltfMesh) {
      this.gltfMesh.material = newMat;
    } else if (this.symbolMesh) {
      this.symbolMesh.traverse((child) => {
        if (child.isMesh) child.material = newMat;
      });
    }

    document.querySelectorAll('.material-btn').forEach(btn => {
      const match = btn.getAttribute('data-material') === key;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match.toString());
    });
  }

  bindButtons() {
    const buttons = document.querySelectorAll('.material-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mat = btn.getAttribute('data-material');
        if (mat) this.setMaterial(mat);
      });
    });
  }

  bindControls() {
    const el = this.canvas;

    const onDown = (clientX, clientY) => {
      this.isPointerDown = true;
      this.previousPointerPosition = { x: clientX, y: clientY };
      el.style.cursor = 'grabbing';
    };

    const onMove = (clientX, clientY) => {
      if (!this.isPointerDown) return;
      const deltaX = clientX - this.previousPointerPosition.x;
      const deltaY = clientY - this.previousPointerPosition.y;

      this.targetRotation.y += deltaX * 0.009;
      this.targetRotation.x = Math.max(-0.6, Math.min(0.6, this.targetRotation.x + deltaY * 0.009));

      this.previousPointerPosition = { x: clientX, y: clientY };
    };

    const onUp = () => {
      this.isPointerDown = false;
      el.style.cursor = 'grab';
    };

    el.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        onDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onUp);
    el.style.cursor = 'grab';
  }

  onResize() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.renderer || !this.scene || !this.camera) return;

    if (this.symbolMesh) {
      if (!this.isPointerDown) {
        this.targetRotation.y += 0.0035;
      }
      this.symbolMesh.rotation.y += (this.targetRotation.y - this.symbolMesh.rotation.y) * 0.08;
      this.symbolMesh.rotation.x += (this.targetRotation.x - this.symbolMesh.rotation.x) * 0.08;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
