'use client';
/**
 * GalleryMode.tsx — minimal-chrome presentation overlay.
 *
 * When `galleryMode` is enabled, all UI chrome (header, panels, footer,
 * toolbars) is hidden and only a slim caption strip remains at the bottom.
 * The 3D canvas keeps full focus. Press Esc or G (or click the exit button)
 * to return to the full interface.
 *
 * Implemented as a sibling overlay that covers the chrome with a translucent
 * scrim and renders a minimal caption; the 3D canvas (z-20) stays visible
 * because gallery chrome is z-40 but only covers the header/footer bands,
 * not the canvas center.
 *
 * In practice, we render a class on the root that hides chrome via CSS, plus
 * a minimal bottom caption. This keeps the 3D untouched.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mountain } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';

export function GalleryMode() {
  const enabled = useMaterialStore((s) => s.galleryMode);
  const setGalleryMode = useMaterialStore((s) => s.setGalleryMode);

  return (
    <AnimatePresence>
      {enabled && (
        <>
          {/* Exit affordance — top-right, subtle */}
          <motion.button
            onClick={() => setGalleryMode(false)}
            className="fixed right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/30 bg-stone-950/50 text-stone-300 backdrop-blur-md transition hover:bg-stone-800/70 hover:text-amber-200"
            aria-label="Salir del modo galería"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Minimal caption — bottom center */}
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 24 }}
          >
            <div className="flex items-center gap-3 rounded-full border border-stone-600/30 bg-stone-950/40 px-5 py-2.5 backdrop-blur-md">
              <Mountain className="h-4 w-4 text-amber-300/80" />
              <span className="font-mono text-sm tracking-[0.24em] text-stone-100">ORIGEN</span>
              <span className="text-stone-600">·</span>
              <span className="text-[11px] tracking-wide text-stone-400">
                Símbolo maestro · Sierra de Albarracín
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
