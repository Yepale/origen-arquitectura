'use client';
/**
 * useKeyboardShortcuts.ts
 *
 * Global keyboard shortcuts for the ORIGEN viewer:
 *   1 / 2 / 3   → LOD master / lod1 / lod2
 *   W           → toggle wireframe
 *   S           → toggle season (summer ↔ winter)
 *   A           → toggle auto-rotate
 *   B           → toggle backdrop
 *   R           → reset view
 *   C           → capture PNG
 *   V           → toggle vertex colors
 *   P           → cycle camera preset (front → hero → side → top)
 *   F           → toggle fullscreen
 *   L           → copy share link (URL hash encodes current state)
 *   ? / H       → toggle shortcuts overlay
 *   Esc         → close any overlay / exit fullscreen
 *
 * Ignores keystrokes when the user is typing in an input/textarea/contenteditable.
 */
import { useEffect } from 'react';
import { useMaterialStore, type CameraPreset } from '@/3d/materialViewer';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

const PRESET_ORDER: CameraPreset[] = ['hero', 'front', 'side', 'top'];

export function useKeyboardShortcuts() {
  const s = useMaterialStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // Don't hijack browser shortcuts with modifiers.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case '1':
          s.setLod('master');
          break;
        case '2':
          s.setLod('lod1');
          break;
        case '3':
          s.setLod('lod2');
          break;
        case 'w':
          s.setWireframe(!s.wireframe);
          break;
        case 's':
          s.setSeason(s.season === 'summer' ? 'winter' : 'summer');
          break;
        case 'a':
          s.setAutoRotate(!s.autoRotate);
          break;
        case 'b':
          s.setShowBackdrop(!s.showBackdrop);
          break;
        case 'v':
          s.setVertexColors(!s.vertexColors);
          break;
        case 'r':
          s.resetView();
          break;
        case 'c':
          s.capture();
          break;
        case 'p':
          {
            const idx = PRESET_ORDER.indexOf(s.cameraPreset);
            const next = PRESET_ORDER[(idx + 1) % PRESET_ORDER.length];
            s.applyCameraPreset(next);
          }
          break;
        case 'f':
          s.setFullscreen(!s.fullscreen);
          break;
        case 'l':
          s.share();
          break;
        case '?':
        case 'h':
          s.toggleShortcuts();
          break;
        case 'escape':
          if (s.showShortcuts) s.toggleShortcuts();
          if (s.showConcept) s.closeConcept();
          if (s.showMobileInfo) s.toggleMobileInfo();
          if (s.fullscreen) s.setFullscreen(false);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [s]);
}
