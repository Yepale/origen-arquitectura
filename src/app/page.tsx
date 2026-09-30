'use client';
/**
 * ORIGEN — landing page (minimal chrome).
 *
 * The 3D symbol is the protagonist. The page has ONLY:
 *   - Header: ORIGEN stone logo + audio toggle + season selector
 *   - Hero: full-viewport 3D canvas (interactive drag-to-assemble)
 *   - Content sections: revealed AFTER the user completes ORIGEN
 *
 * All technical controls (toolbar, panel, telemetry, presets, LOD, wireframe,
 * edges, bookmarks, compare, guided tour, camera buttons, capture/share/
 * fullscreen/shortcuts) are removed from the public UI. The store + keyboard
 * shortcuts remain internally for development.
 *
 * Art direction: stone tones, serif, no SaaS/glassmorphism.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Sun, Snowflake } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useMaterialStore } from '@/3d/materialViewer';
import { useKeyboardShortcuts } from '@/3d/useKeyboardShortcuts';
import { useUrlState, useShareLink } from '@/3d/useUrlState';
import { ConceptSection } from '@/components/origen/sections/ConceptSection';
import { PhilosophySection } from '@/components/origen/sections/PhilosophySection';
import { ProjectsSection } from '@/components/origen/sections/ProjectsSection';
import { ContactSection } from '@/components/origen/sections/ContactSection';

const OrigenViewer = dynamic(
  () => import('@/components/origen/OrigenViewer').then((m) => m.OrigenViewer),
  { ssr: false, loading: () => <ViewerLoading /> }
);

export default function OrigenPage() {
  const season = useMaterialStore((s) => s.season);
  const setSeason = useMaterialStore((s) => s.setSeason);
  const audioEnabled = useMaterialStore((s) => s.audioEnabled);
  const setAudioEnabled = useMaterialStore((s) => s.setAudioEnabled);
  const assembled = useMaterialStore((s) => s.assembled);

  useKeyboardShortcuts();
  useUrlState();
  useShareLink();

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      <Toaster richColors position="top-center" theme="dark" />

      {/* ───────── Header (minimal: logo + audio + season) ───────── */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <motion.img
            src="/assets/origen_logo_stone.png"
            alt="ORIGEN"
            className="h-7 w-auto object-contain sm:h-8"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
          {/* Only: audio toggle + season selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-600/40 bg-stone-950/40 text-stone-300 transition hover:text-amber-200"
              aria-label="Audio"
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setSeason(season === 'summer' ? 'winter' : 'summer')}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-mono tracking-wide transition ${
                season === 'summer'
                  ? 'border-amber-300/50 bg-amber-500/10 text-amber-100'
                  : 'border-sky-300/50 bg-sky-500/10 text-sky-100'
              }`}
            >
              {season === 'summer' ? <Sun className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
              {season === 'summer' ? 'Verano' : 'Invierno'}
            </button>
          </div>
        </div>
      </header>

      {/* ───────── Hero (3D + interactive assembly) ───────── */}
      <section className="relative h-screen w-full overflow-hidden">
        <SeasonBackdrop season={season} />
        <div className="absolute inset-0">
          <OrigenViewer />
        </div>

        {/* Assembly hint — shown while the user hasn't completed the symbol */}
        {!assembled && (
          <motion.div
            className="absolute inset-x-0 bottom-10 z-30 flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <p className="font-serif text-sm tracking-wide text-stone-300/80">
              Arrastra las tres piezas para construir ORIGEN
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
              TIERRA · TIEMPO · MANO
            </p>
          </motion.div>
        )}
      </section>

      {/* ───────── Content sections (revealed after assembly) ───────── */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            <ConceptSection />
            <PhilosophySection />
            <ProjectsSection />
            <ContactSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Internal overlays (kept for dev, invisible in normal UX) */}
      <div className="hidden">
        <ShortcutsOverlayLazy />
      </div>
    </div>
  );
}

// Lazy-load ShortcutsOverlay so the component code stays in the bundle
// for keyboard shortcuts, but the UI is hidden.
const ShortcutsOverlayLazy = dynamic(
  () => import('@/components/origen/ShortcutsOverlay').then((m) => m.ShortcutsOverlay),
  { ssr: false }
);

/* ─────────────────────────────────────────────────────────────────────── */

function SeasonBackdrop({ season }: { season: 'summer' | 'winter' }) {
  const summer = '/assets/panoramic/origen_panoramic_summer_16X9.png';
  const winter = '/assets/panoramic/origen_panoramic_winter_16x9.png';
  const summerP = '/assets/panoramic/origen_panoramic_summer_9X16.png';
  const winterP = '/assets/panoramic/origen_panoramic_winter_9x16.png';
  const landscape = season === 'summer' ? summer : winter;
  const portrait = season === 'summer' ? summerP : winterP;
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <AnimatePresence>
        <motion.img
          key={season + '-l'}
          src={landscape}
          alt={`Sierra de Albarracín — ${season}`}
          className="absolute inset-0 h-full w-full object-cover portrait:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        />
      </AnimatePresence>
      <AnimatePresence>
        <motion.img
          key={season + '-p'}
          src={portrait}
          alt={`Sierra de Albarracín — ${season}`}
          className="absolute inset-0 h-full w-full object-cover landscape:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 via-transparent to-stone-950" />
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-950">
      <div className="flex flex-col items-center gap-4 text-stone-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-300" />
        <p className="font-mono text-xs tracking-widest">Cargando ORIGEN…</p>
      </div>
    </div>
  );
}
