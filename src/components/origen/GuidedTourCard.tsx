'use client';
/**
 * GuidedTourCard.tsx — synchronized narration card for the guided tour.
 *
 * While `guidedTour` is enabled, a slim card at the bottom-center shows the
 * title + body for the *current* camera preset. As the auto-tour moves
 * through the presets, the card cross-fades to the next narration. The card
 * is click-through except for the close button, so it never blocks the 3D.
 *
 * The card reads `cameraPreset` from the store (kept in sync by the
 * auto-tour's preset effect). The narration copy lives in
 * `PRESET_NARRATION` so it stays editable in one place.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { useMaterialStore, PRESET_NARRATION } from '@/3d/materialViewer';

export function GuidedTourCard() {
  const enabled = useMaterialStore((s) => s.guidedTour);
  const preset = useMaterialStore((s) => s.cameraPreset);
  const setGuidedTour = useMaterialStore((s) => s.setGuidedTour);

  const copy = PRESET_NARRATION[preset];

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex justify-center px-4 sm:bottom-24"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <div className="pointer-events-auto relative w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-amber-300/30 bg-stone-950/85 p-4 backdrop-blur-xl sm:p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-500/10">
                  <MapPin className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-200/70">
                    Recorrido guiado · {presetLabel(preset)}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.h3
                      key={copy.title}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35 }}
                      className="text-base font-semibold text-stone-50"
                    >
                      {copy.title}
                    </motion.h3>
                  </AnimatePresence>
                </div>
              </div>
              <button
                onClick={() => setGuidedTour(false)}
                className="shrink-0 rounded-md p-1 text-stone-400 transition hover:bg-stone-800/60 hover:text-stone-100"
                aria-label="Cerrar recorrido"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={copy.body}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="mt-2 text-[13px] leading-relaxed text-stone-300"
              >
                {copy.body}
              </motion.p>
            </AnimatePresence>
            {/* Progress dots */}
            <div className="mt-3 flex items-center gap-1.5">
              {(['hero', 'front', 'side', 'top'] as const).map((p, i) => (
                <span
                  key={p}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    p === preset ? 'w-6 bg-amber-300' : 'w-2 bg-stone-600/60'
                  }`}
                />
              ))}
              <span className="ml-2 font-mono text-[10px] text-stone-500">
                {(['hero', 'front', 'side', 'top'] as const).indexOf(preset) + 1}/4
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function presetLabel(p: string): string {
  switch (p) {
    case 'hero': return 'Vista 1';
    case 'front': return 'Vista 2';
    case 'side': return 'Vista 3';
    case 'top': return 'Vista 4';
    default: return 'Vista';
  }
}
