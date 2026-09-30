'use client';
/**
 * ORIGEN — landing page final.
 *
 * The 3D symbol is the protagonist. The page is a single architectural
 * scroll: Header → Hero (3D + assembly animation) → Concept → Philosophy
 * → Projects → Contact.
 *
 * Art direction: stone tones, serif headings, generous whitespace, no
 * SaaS / glassmorphism / tech gradients. The silence is the point.
 *
 * The 3D viewer controls (panel, toolbar, shortcuts) are available but
 * subtle — revealed on demand, never dominating the first viewport.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useMaterialStore } from '@/3d/materialViewer';
import { useIsMobile } from '@/hooks/use-mobile';
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
const ControlPanel = dynamic(
  () => import('@/components/origen/ControlPanel').then((m) => m.ControlPanel),
  { ssr: false }
);
const ActionToolbar = dynamic(
  () => import('@/components/origen/ActionToolbar').then((m) => m.ActionToolbar),
  { ssr: false }
);
const ShortcutsOverlay = dynamic(
  () => import('@/components/origen/ShortcutsOverlay').then((m) => m.ShortcutsOverlay),
  { ssr: false }
);
const ConceptOverlay = dynamic(
  () => import('@/components/origen/ConceptOverlay').then((m) => m.ConceptOverlay),
  { ssr: false }
);
const GuidedTourCard = dynamic(
  () => import('@/components/origen/GuidedTourCard').then((m) => m.GuidedTourCard),
  { ssr: false }
);
const CompareView = dynamic(
  () => import('@/components/origen/CompareView').then((m) => m.CompareView),
  { ssr: false }
);
const GalleryMode = dynamic(
  () => import('@/components/origen/GalleryMode').then((m) => m.GalleryMode),
  { ssr: false }
);
const BookmarksPanel = dynamic(
  () => import('@/components/origen/BookmarksPanel').then((m) => m.BookmarksPanel),
  { ssr: false }
);

export default function OrigenPage() {
  const season = useMaterialStore((s) => s.season);
  const audioEnabled = useMaterialStore((s) => s.audioEnabled);
  const setAudioEnabled = useMaterialStore((s) => s.setAudioEnabled);
  const galleryMode = useMaterialStore((s) => s.galleryMode);
  const isMobile = useIsMobile();

  useKeyboardShortcuts();
  useUrlState();
  useShareLink();

  // Fullscreen handling
  const rootRef = useRef<HTMLDivElement>(null);
  const fullscreen = useMaterialStore((s) => s.fullscreen);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (fullscreen) {
      if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [fullscreen]);
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && useMaterialStore.getState().fullscreen) {
        useMaterialStore.getState().setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const [panelOpen, setPanelOpen] = useState(false);
  // Controls fade in AFTER the assembly animation completes (~4s) so the
  // first viewport is extremely clean during the intro.
  const [showControls, setShowControls] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowControls(true), 4200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-screen bg-stone-950 text-stone-100">
      <Toaster richColors position="top-center" theme="dark" />

      {/* ───────── Header ───────── */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-opacity duration-500 ${
          galleryMode ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo (stone wordmark PNG) */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <img
              src="/assets/origen_logo_stone.png"
              alt="ORIGEN"
              className="h-7 w-auto object-contain sm:h-8"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            />
          </motion.div>
          {/* Minimal nav */}
          <motion.nav
            className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400 md:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <a href="#concepto" className="transition hover:text-amber-200">Concepto</a>
            <a href="#filosofia" className="transition hover:text-amber-200">Filosofía</a>
            <a href="#arquitectura" className="transition hover:text-amber-200">Arquitectura</a>
            <a href="#contacto" className="transition hover:text-amber-200">Contacto</a>
          </motion.nav>
          {/* Audio toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-600/40 bg-stone-950/40 text-stone-300 transition hover:text-amber-200"
            aria-label="Audio"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ───────── Hero (3D + assembly animation) ───────── */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Seasonal backdrop */}
        <SeasonBackdrop season={season} />
        {/* 3D Canvas fills the hero */}
        <div className="absolute inset-0">
          <OrigenViewer />
        </div>

        {/* Action toolbar — fades in after the assembly animation completes */}
        {!galleryMode && (
          <motion.div
            className="absolute inset-x-0 top-20 z-30 flex justify-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -10 }}
            transition={{ duration: 0.8 }}
          >
            <ActionToolbar />
          </motion.div>
        )}

        {/* Control panel (collapsed by default, revealed on demand) */}
        <div
          className={`absolute inset-y-0 right-0 z-30 flex items-center p-4 transition-opacity duration-700 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {panelOpen ? (
              <motion.div
                key="panel"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="max-h-[80vh] overflow-y-auto"
              >
                <ControlPanel />
              </motion.div>
            ) : (
              <motion.button
                key="toggle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => setPanelOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/30 bg-stone-950/40 text-amber-200/70 backdrop-blur-sm transition hover:bg-stone-800/60 hover:text-amber-200"
                aria-label="Abrir panel"
              >
                <Sparkles className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>
          {panelOpen && (
            <button
              onClick={() => setPanelOpen(false)}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-stone-500/30 bg-stone-950/40 text-stone-400 hover:text-stone-200"
              aria-label="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-2 text-stone-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: galleryMode ? 0 : 1 }}
          transition={{ delay: 4, duration: 1 }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.32em]">
            Descubre
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ───────── Content sections ───────── */}
      <ConceptSection />
      <PhilosophySection />
      <ProjectsSection />
      <ContactSection />

      {/* ───────── Overlays ───────── */}
      <ShortcutsOverlay />
      <ConceptOverlay />
      <GuidedTourCard />
      <CompareView />
      <GalleryMode />
      <BookmarksPanel />
    </div>
  );
}

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
