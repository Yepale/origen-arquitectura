'use client';
/**
 * ActionToolbar.tsx — floating camera action buttons (reset view + capture).
 *
 * Sits at the top-center of the viewer on desktop, top-right on mobile.
 * Emits transient signals consumed by the camera rig / composition.
 */
import { motion } from 'framer-motion';
import { RotateCcw, Camera, Keyboard } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';

export function ActionToolbar() {
  const resetView = useMaterialStore((s) => s.resetView);
  const capture = useMaterialStore((s) => s.capture);
  const toggleShortcuts = useMaterialStore((s) => s.toggleShortcuts);

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-stone-500/40 bg-stone-950/65 text-stone-200 backdrop-blur-md transition hover:bg-stone-800/80 hover:text-amber-200';

  return (
    <motion.div
      className="pointer-events-auto flex items-center gap-2"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 22 }}
    >
      <button
        onClick={resetView}
        className={btn}
        title="Restablecer vista (R)"
        aria-label="Restablecer vista"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={capture}
        className={btn}
        title="Capturar PNG (C)"
        aria-label="Capturar imagen"
      >
        <Camera className="h-4 w-4" />
      </button>
      <button
        onClick={toggleShortcuts}
        className={btn}
        title="Atajos de teclado (H)"
        aria-label="Atajos"
      >
        <Keyboard className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
