import { SceneManager } from './3d/sceneManager.js';
import { buildStonePieces } from './3d/stonePieces.js';
import { InteractionController } from './3d/interaction.js';
import { CameraRig } from './3d/cameraRig.js';
import { MaterialViewer } from './3d/materialViewer.js';
import { stoneAudio } from './audio/stoneAudio.js';
import gsap from 'gsap';

/**
 * ORIGEN — Main Application & State Machine Orchestrator
 * Estados: INTRO -> PIECE_LOCKED -> COMPLETE -> FLY_THROUGH -> LANDING
 */

class OrigenApp {
  constructor() {
    this.state = 'INTRO'; // 'INTRO' | 'COMPLETE' | 'FLY_THROUGH' | 'LANDING'
    this.sceneManager = null;
    this.piecesData = null;
    this.interaction = null;
    this.cameraRig = null;
    this.materialViewer = null;

    // Elementos del DOM
    this.dom = {
      introExp: document.getElementById('intro-experience'),
      mainCanvas: document.getElementById('main-canvas'),
      introUi: document.getElementById('intro-ui'),
      introHint: document.getElementById('intro-hint'),
      btnSkip: document.getElementById('btn-skip'),
      labels: {
        tierra: document.getElementById('label-tierra'),
        tiempo: document.getElementById('label-tiempo'),
        mano: document.getElementById('label-mano')
      },
      progressDots: [
        document.getElementById('progress-1'),
        document.getElementById('progress-2'),
        document.getElementById('progress-3')
      ],
      revealOverlay: document.getElementById('reveal-overlay'),
      transitionOverlay: document.getElementById('transition-overlay'),
      landingPage: document.getElementById('landing-page'),
      btnRevive: document.getElementById('btn-revive-intro'),
      mobileMenuBtn: document.getElementById('mobile-menu-btn'),
      mobileNav: document.getElementById('mobile-nav'),
      contactForm: document.getElementById('contact-form')
    };

    this.init();
  }

  init() {
    if (!this.dom.mainCanvas) return;

    // 1. Inicializar SceneManager (3D Canvas principal)
    this.sceneManager = new SceneManager(this.dom.mainCanvas);

    // 2. Construir geometrías y materiales de las piezas pétreas
    this.piecesData = buildStonePieces(this.sceneManager.scene);

    // Conectar pedestalGroup al sceneManager para rotación solo en Y
    this.sceneManager.pedestalGroup = this.piecesData.pedestalGroup;

    // 3. Inicializar Camera Rig
    this.cameraRig = new CameraRig(this.sceneManager.camera, this.dom.mainCanvas);

    // 4. Inicializar Interaction Controller
    this.interaction = new InteractionController(
      this.dom.mainCanvas,
      this.sceneManager.camera,
      this.piecesData,
      {
        onPieceLocked: this.handlePieceLocked.bind(this),
        onAllLocked: this.handleAllLocked.bind(this),
        onDragStart: this.handleDragStart.bind(this),
        onDragEnd: this.handleDragEnd.bind(this)
      }
    );

    // 5. Vincular bucle de animación para físicas e interpolaciones
    this.sceneManager.addUpdateCallback((delta, time) => {
      if (this.state === 'INTRO' || this.state === 'COMPLETE') {
        this.interaction.update(delta, time);
        this.cameraRig.update();
      }
    });

    // 6. Configurar listeners de interfaz (botones, formularios, navegación)
    this.setupUIEvents();
  }

  setupUIEvents() {
    // Control de banda sonora ambiental
    const toggleSoundtrack = () => {
      stoneAudio.resume();
      const isMuted = stoneAudio.toggleMute();

      // Actualizar todos los botones de soundtrack (intro + header)
      document.querySelectorAll('.btn-soundtrack').forEach(btn => {
        const iconOn  = btn.querySelector('.icon-sound-on');
        const iconOff = btn.querySelector('.icon-sound-off');
        btn.classList.toggle('muted', isMuted);
        btn.setAttribute('aria-pressed', isMuted.toString());
        if (iconOn)  iconOn.style.display  = isMuted ? 'none'         : '';
        if (iconOff) iconOff.style.display = isMuted ? ''             : 'none';
      });
    };

    const introMusicBtn = document.getElementById('btn-soundtrack-toggle');
    if (introMusicBtn) introMusicBtn.addEventListener('click', toggleSoundtrack);

    const headerMusicBtn = document.getElementById('header-soundtrack-toggle');
    if (headerMusicBtn) headerMusicBtn.addEventListener('click', toggleSoundtrack);

    // btn-skip eliminado del UI — el símbolo se completa arrastrando las piezas
    // En móvil: toque largo en canvas dispara autoComplete como accesibilidad
    if (this.dom.btnSkip) {
      this.dom.btnSkip.addEventListener('click', () => {
        stoneAudio.resume();
        this.interaction.autoCompleteAll();
      });
    }

    // Botón "Revivir Intro 3D" en el header de la Landing
    if (this.dom.btnRevive) {
      this.dom.btnRevive.addEventListener('click', (e) => {
        e.preventDefault();
        this.reviveIntro();
      });
    }

    // Menú móvil hamburguesa
    if (this.dom.mobileMenuBtn && this.dom.mobileNav) {
      this.dom.mobileMenuBtn.addEventListener('click', () => {
        const isOpen = this.dom.mobileNav.classList.toggle('active');
        this.dom.mobileMenuBtn.classList.toggle('active', isOpen);
        this.dom.mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
      });

      // Cerrar al pulsar enlace en móvil
      this.dom.mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          this.dom.mobileNav.classList.remove('active');
          this.dom.mobileMenuBtn.classList.remove('active');
          this.dom.mobileMenuBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Formulario de contacto
    if (this.dom.contactForm) {
      this.dom.contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-form');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>ENVIANDO...</span>`;
          setTimeout(() => {
            submitBtn.innerHTML = `<span>MENSAJE ENVIADO CON ÉXITO</span>`;
            submitBtn.style.background = '#324a35';
            submitBtn.style.color = '#e2f5e4';
            this.dom.contactForm.reset();
            setTimeout(() => {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `ENVIAR MENSAJE <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>`;
              submitBtn.style.background = '';
              submitBtn.style.color = '';
            }, 3500);
          }, 900);
        }
      });
    }

    // Scroll suave para todos los enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  handleDragStart(pieceName) {
    if (this.dom.introHint) {
      this.dom.introHint.style.opacity = '0';
    }
  }

  handleDragEnd(pieceName) {
    // Si no se ha completado ninguna pieza, devolver visibilidad al hint
    if (this.interaction.lockedCount === 0 && this.dom.introHint) {
      this.dom.introHint.style.opacity = '0.7';
    }
  }

  handlePieceLocked(pieceName, totalLocked) {
    // Marcar dot de progreso
    if (totalLocked >= 1 && totalLocked <= 3) {
      const dot = this.dom.progressDots[totalLocked - 1];
      if (dot) dot.classList.add('active');
    }

    // Marcar etiqueta de la pieza
    const label = this.dom.labels[pieceName];
    if (label) {
      label.classList.add('locked');
    }
  }

  handleAllLocked() {
    this.state = 'COMPLETE';

    // 1. Ocultar UI de intro de forma suave
    if (this.dom.introUi) {
      gsap.to(this.dom.introUi, {
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        pointerEvents: 'none'
      });
    }

    // 2. Transición cinemática de cámara (reencuadre majestuoso del monolito completo)
    this.cameraRig.focusCompletedSymbol(() => {
      // 3. Pausa contemplativa limpia (sin textos que tapen la escultura de piedra)
      setTimeout(() => {
        this.startFlyThrough();
      }, 1400);
    });
  }

  startFlyThrough() {
    this.state = 'FLY_THROUGH';

    // Ejecutar vuelo cinemático Three.js continuo a través del orificio del monolito
    this.cameraRig.flyThrough(
      // Midpoint: destello blanco / niebla dorada de portal
      () => {
        if (this.dom.transitionOverlay) {
          gsap.to(this.dom.transitionOverlay, {
            opacity: 1,
            duration: 0.45,
            ease: 'power2.in',
            onComplete: () => {
              // Revelar landing page mientras la pantalla está iluminada
              this.showLandingPage();
            }
          });
        } else {
          this.showLandingPage();
        }
      },
      // Fin del vuelo
      () => {
        if (this.dom.transitionOverlay) {
          gsap.to(this.dom.transitionOverlay, {
            opacity: 0,
            duration: 0.9,
            ease: 'power2.out',
            onComplete: () => {
              this.dom.transitionOverlay.setAttribute('aria-hidden', 'true');
            }
          });
        }
      }
    );
  }

  showLandingPage() {
    this.state = 'LANDING';

    // Ocultar contenedor de la intro
    if (this.dom.introExp) {
      this.dom.introExp.style.display = 'none';
    }

    // Activar landing page
    if (this.dom.landingPage) {
      this.dom.landingPage.classList.add('visible');
      this.dom.landingPage.setAttribute('aria-hidden', 'false');
      window.scrollTo(0, 0);

      // Iniciar el Visor 3D de Materiales interactivo
      if (!this.materialViewer) {
        this.materialViewer = new MaterialViewer('viewer-canvas');
      }
    }
  }

  reviveIntro() {
    // Restaurar estado a INTRO
    this.state = 'INTRO';

    // Ocultar landing
    if (this.dom.landingPage) {
      this.dom.landingPage.classList.remove('visible');
      this.dom.landingPage.setAttribute('aria-hidden', 'true');
    }

    // Mostrar intro
    if (this.dom.introExp) {
      this.dom.introExp.style.display = 'block';
    }

    if (this.dom.revealOverlay) {
      this.dom.revealOverlay.classList.remove('active');
      this.dom.revealOverlay.setAttribute('aria-hidden', 'true');
      this.dom.revealOverlay.style.opacity = '1';
    }

    if (this.dom.introUi) {
      this.dom.introUi.style.opacity = '1';
      this.dom.introUi.style.pointerEvents = 'auto';
    }

    if (this.dom.introHint) {
      this.dom.introHint.style.opacity = '0.7';
    }

    // Resetear indicadores
    this.dom.progressDots.forEach(dot => dot && dot.classList.remove('active'));
    Object.values(this.dom.labels).forEach(lbl => lbl && lbl.classList.remove('locked'));

    // Resetear piezas
    Object.values(this.piecesData.pieces).forEach(p => {
      p.isLocked = false;
      p.isDragging = false;
      p.group.position.copy(p.initialPos);
      p.group.rotation.copy(p.initialRot);
      if (p.ghost) {
        p.ghost.visible = false; // Ghost siempre invisible — escena limpia
      }
      if (p.glowMesh) {
        p.glowMesh.visible = false;
      }
    });

    this.interaction.lockedCount = 0;
    this.interaction.isCompleted = false;

    // Resetear cámara
    this.cameraRig.resetToIntro();
  }
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  new OrigenApp();
});
