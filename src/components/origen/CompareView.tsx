'use client';
/**
 * CompareView.tsx — summer | winter split-view overlay.
 *
 * When `compareView` is enabled, the page swaps to a side-by-side layout:
 *   ┌──────────────┬──────────────┐
 *   │   VERANO     │   INVIERNO   │
 *   │  (summer)    │  (winter)    │
 *   └──────────────┴──────────────┘
 *
 * Implementation: a full-screen fixed overlay that renders two backdrop
 * images side by side with a draggable-feeling divider, each labeled with
 * its season. The 3D canvas stays centered behind the divider so the
 * monolith reads as one continuous object spanning both seasons — a
 * marketing "hero moment".
 *
 * The overlay is purely presentational; it does not touch the store season
 * (so closing compare view restores the user's chosen season cleanly).
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Snowflake } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';

const SUMMER_LANDSCAPE = '/assets/panoramic/origen_panoramic_summer_16X9.png';
const WINTER_LANDSCAPE = '/assets/panoramic/origen_panoramic_winter_16x9.png';
const SUMMER_PORTRAIT = '/assets/panoramic/origen_panoramic_summer_9X16.png';
const WINTER_PORTRAIT = '/assets/panoramic/origen_panoramic_winter_9x16.png';

export function CompareView() {
  const enabled = useMaterialStore((s) => s.compareView);
  const setCompareView = useMaterialStore((s) => s.setCompareView);

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="fixed inset-0 z-40 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Summer half (left) */}
          <motion.div
            className="relative flex-1 overflow-hidden"
            initial={{ x: -40 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          >
            <img
              src={SUMMER_LANDSCAPE}
              alt="Sierra de Albarracín — Verano"
              className="absolute inset-0 h-full w-full object-cover portrait:hidden"
            />
            <img
              src={SUMMER_PORTRAIT}
              alt="Sierra de Albarracín — Verano"
              className="absolute inset-0 h-full w-full object-cover landscape:hidden"
            />
            {/* Warm tint on the summer half */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 to-transparent" />
            {/* Season label */}
            <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full border border-amber-300/40 bg-stone-950/70 px-4 py-2 backdrop-blur-md">
              <Sun className="h-4 w-4 text-amber-300" />
              <span className="font-mono text-sm tracking-widest text-amber-100">VERANO</span>
            </div>
          </motion.div>

          {/* Winter half (right) */}
          <motion.div
            className="relative flex-1 overflow-hidden"
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          >
            <img
              src={WINTER_LANDSCAPE}
              alt="Sierra de Albarracín — Invierno"
              className="absolute inset-0 h-full w-full object-cover portrait:hidden"
            />
            <img
              src={WINTER_PORTRAIT}
              alt="Sierra de Albarracín — Invierno"
              className="absolute inset-0 h-full w-full object-cover landscape:hidden"
            />
            {/* Cool tint on the winter half */}
            <div className="absolute inset-0 bg-gradient-to-l from-sky-900/10 to-transparent" />
            {/* Season label */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-sky-300/40 bg-stone-950/70 px-4 py-2 backdrop-blur-md">
              <Snowflake className="h-4 w-4 text-sky-300" />
              <span className="font-mono text-sm tracking-widest text-sky-100">INVIERNO</span>
            </div>
          </motion.div>

          {/* Center divider */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-stone-100/40 to-transparent" />
            <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-400/40 bg-stone-950/80 backdrop-blur-md">
              <span className="font-mono text-[10px] tracking-widest text-stone-300">VS</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setCompareView(false)}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-stone-400/40 bg-stone-950/70 text-stone-200 backdrop-blur-md transition hover:bg-stone-800/80 hover:text-amber-200"
            aria-label="Cerrar vista comparativa"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Caption */}
          <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center">
            <div className="rounded-full border border-stone-600/40 bg-stone-950/70 px-5 py-2 text-center backdrop-blur-md">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-stone-300">
                ORIGEN · Verano / Invierno
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
