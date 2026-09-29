'use client';
/**
 * ORIGEN — master 3D logo symbol viewer.
 *
 * A single route ("/") presenting the immutable ORIGEN_MASTER.glb emblem
 * resting on a spatial-reference pedestal, against seasonal panoramas of
 * the Sierra de Albarracín (Teruel, Spain).
 *
 * Production contract honored:
 *   - The GLB is loaded whole; ORIGEN_SYMBOL found by name; never split.
 *   - The pedestal is a separate reference; never merged into the symbol.
 *   - Only material parameters are tweaked at runtime; geometry untouched.
 *
 * Features:
 *   - Seasonal panorama (summer/winter, orientation-aware).
 *   - Material inspector (wireframe / roughness / vertex colors / env / LOD).
 *   - Reset view, capture PNG, keyboard shortcuts, concept explainer.
 *   - Entrance animation (monolith rises + fades in).
 *   - Live telemetry (fps / draw calls / triangles).
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain,
  Clock,
  Hand,
  Info,
  X,
  Github,
  Sparkles,
  MapPin,
  Compass,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useMaterialStore } from '@/3d/materialViewer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/3d/useKeyboardShortcuts';
import { useUrlState, useShareLink } from '@/3d/useUrlState';

// Three.js Canvas must be client-only (no SSR).
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
const TelemetryStrip = dynamic(
  () => import('@/components/origen/TelemetryStrip').then((m) => m.TelemetryStrip),
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
const MobileInfoSheet = dynamic(
  () => import('@/components/origen/MobileInfoSheet').then((m) => m.MobileInfoSheet),
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

const SUMMER_LANDSCAPE = '/assets/panoramic/origen_panoramic_summer_16X9.png';
const SUMMER_PORTRAIT = '/assets/panoramic/origen_panoramic_summer_9X16.png';
const WINTER_LANDSCAPE = '/assets/panoramic/origen_panoramic_winter_16x9.png';
const WINTER_PORTRAIT = '/assets/panoramic/origen_panoramic_winter_9x16.png';

export default function OrigenPage() {
  const season = useMaterialStore((s) => s.season);
  const showBackdrop = useMaterialStore((s) => s.showBackdrop);
  const setSeason = useMaterialStore((s) => s.setSeason);
  const openConcept = useMaterialStore((s) => s.openConcept);
  const fullscreen = useMaterialStore((s) => s.fullscreen);
  const toggleMobileInfo = useMaterialStore((s) => s.toggleMobileInfo);
  const galleryMode = useMaterialStore((s) => s.galleryMode);
  const compareView = useMaterialStore((s) => s.compareView);
  const isMobile = useIsMobile();
  // Wire up global keyboard shortcuts, URL-hash state sync, and the
  // share-link clipboard consumer.
  useKeyboardShortcuts();
  useUrlState();
  useShareLink();

  // Fullscreen handling: toggle the Fullscreen API on the root container.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (fullscreen) {
      if (document.fullscreenElement) return; // already fullscreen
      el.requestFullscreen?.().catch(() => {
        /* some browsers/iframes disallow — silently ignore */
      });
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [fullscreen]);
  // Sync the store if the user exits fullscreen via Esc (browser-controlled).
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && useMaterialStore.getState().fullscreen) {
        useMaterialStore.getState().setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);


  // Panels default open on desktop, closed on mobile. The override stores any
  // explicit user choice; otherwise the open state derives from isMobile.
  const [override, setOverride] = useState<{ panel?: boolean; info?: boolean }>({});
  const panelOpen = override.panel ?? !isMobile;
  const infoOpen = override.info ?? !isMobile;
  const setPanelOpen = (v: boolean) => setOverride((o) => ({ ...o, panel: v }));
  const setInfoOpen = (v: boolean) => setOverride((o) => ({ ...o, info: v }));

  const landscape = season === 'summer' ? SUMMER_LANDSCAPE : WINTER_LANDSCAPE;
  const portrait = season === 'summer' ? SUMMER_PORTRAIT : WINTER_PORTRAIT;

  return (
    <div ref={rootRef} className="relative flex min-h-screen flex-col overflow-hidden bg-stone-950 text-stone-100">
      <Toaster richColors position="top-center" theme="dark" />

      {/* ───────── Seasonal panoramic backdrop ───────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <AnimatePresence>
          {showBackdrop && (
            <motion.picture
              key={season + '-landscape'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 portrait:hidden"
            >
              <img
                src={landscape}
                alt={`Sierra de Albarracín — ${season}`}
                className="h-full w-full object-cover"
              />
            </motion.picture>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showBackdrop && (
            <motion.picture
              key={season + '-portrait'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 landscape:hidden"
            >
              <img
                src={portrait}
                alt={`Sierra de Albarracín — ${season}`}
                className="h-full w-full object-cover"
              />
            </motion.picture>
          )}
        </AnimatePresence>
        {/* Atmospheric vignette to seat the monolith */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />
        <div
          className="absolute inset-0"
          style={{
            background:
              season === 'summer'
                ? 'radial-gradient(ellipse at 50% 70%, rgba(0,0,0,0) 35%, rgba(60,42,18,0.35) 100%)'
                : 'radial-gradient(ellipse at 50% 70%, rgba(0,0,0,0) 35%, rgba(30,40,55,0.4) 100%)',
          }}
        />
        {/* Subtle film grain / texture overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* ───────── Header ───────── */}
      <header className={`relative z-30 flex items-center justify-between gap-3 px-4 py-3 transition-opacity duration-500 sm:px-6 sm:py-4 ${galleryMode ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <motion.div
          className="flex items-center gap-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/40 bg-gradient-to-b from-stone-800/80 to-stone-950/80 backdrop-blur-sm shadow-lg">
            <Mountain className="h-5 w-5 text-amber-200" />
            <span className="absolute -bottom-1 left-1/2 h-px w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
          </div>
          <div className="leading-tight">
            <h1 className="font-mono text-lg font-semibold tracking-[0.24em] text-stone-50 sm:text-xl">
              ORIGEN
            </h1>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.32em] text-amber-200/80 sm:text-[11px]">
              <MapPin className="h-2.5 w-2.5" />
              Estudio de arquitectura
            </p>
          </div>
        </motion.div>

        {/* Center: interactive concept tags (desktop) */}
        <motion.div
          className="hidden items-center gap-1.5 md:flex"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <ConceptTag icon={<Mountain className="h-3 w-3" />} label="Tierra" tone="amber" onClick={() => openConcept('tierra')} />
          <span className="text-stone-600">·</span>
          <ConceptTag icon={<Clock className="h-3 w-3" />} label="Tiempo" tone="slate" onClick={() => openConcept('tiempo')} />
          <span className="text-stone-600">·</span>
          <ConceptTag icon={<Hand className="h-3 w-3" />} label="Mano" tone="stone" onClick={() => openConcept('mano')} />
        </motion.div>

        {/* Right: telemetry + format badge */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <TelemetryStrip />
          <div className="hidden items-center gap-1 rounded-full border border-stone-600/40 bg-stone-950/60 px-2.5 py-1 font-mono text-[10px] text-stone-300 backdrop-blur sm:flex">
            <span className="text-amber-200">glTF</span>
            <span className="text-stone-600">2.0</span>
          </div>
        </motion.div>
      </header>

      {/* ───────── Main viewer ───────── */}
      <main className="relative z-20 flex-1">
        <div className="absolute inset-0">
          <OrigenViewer />
        </div>

        {/* Top-center action toolbar (reset / capture / shortcuts) */}
        <div className={`pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center transition-opacity duration-500 sm:top-3 ${galleryMode ? 'opacity-0' : 'opacity-100'}`}>
          <ActionToolbar />
        </div>

        {/* Control panel — bottom sheet on mobile, right side on desktop */}
        <div className={`pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-30 flex justify-center px-3 transition-opacity duration-500 sm:inset-x-auto sm:inset-y-0 sm:bottom-auto sm:right-0 sm:items-center sm:justify-end sm:p-4 ${galleryMode ? 'opacity-0' : 'opacity-100'}`}>
          <div className="pointer-events-auto w-full max-w-[24rem] sm:w-auto">
            <AnimatePresence mode="popLayout">
              {panelOpen ? (
                <motion.div
                  key="panel"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="max-h-[60vh] overflow-y-auto sm:max-h-[calc(100vh-7rem)]"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-400/40 bg-stone-900/70 text-amber-200 backdrop-blur hover:bg-stone-800/80"
                  aria-label="Abrir panel"
                >
                  <Sparkles className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {panelOpen && (
            <button
              onClick={() => setPanelOpen(false)}
              className="pointer-events-auto ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-stone-400/30 bg-stone-900/50 text-stone-300 hover:bg-stone-800/70"
              aria-label="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Info card — hidden by default on mobile, bottom-left on desktop */}
        <div className={`pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-20 hidden justify-start p-3 transition-opacity duration-500 sm:flex sm:p-4 ${galleryMode ? 'opacity-0' : 'opacity-100'}`}>
          <div className="pointer-events-auto w-full max-w-md">
            <AnimatePresence mode="popLayout">
              {infoOpen ? (
                <motion.div
                  key="info"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                >
                  <InfoCard season={season} onClose={() => setInfoOpen(false)} onConcept={openConcept} />
                </motion.div>
              ) : (
                <motion.button
                  key="infotoggle"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  onClick={() => setInfoOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-stone-400/40 bg-stone-900/70 px-4 py-2 text-sm text-stone-200 backdrop-blur hover:bg-stone-800/80"
                >
                  <Info className="h-4 w-4 text-amber-200" /> Símbolo
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Vertical season label (decorative, desktop) */}
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
          <span
            className={`block font-mono text-[10px] uppercase tracking-[0.4em] text-stone-400/70 [writing-mode:vertical-rl]`}
            style={{ transform: 'rotate(180deg)' }}
          >
            {season === 'summer' ? 'Sierra de Albarracín · Verano' : 'Sierra de Albarracín · Invierno'}
          </span>
        </div>
      </main>

      {/* ───────── Sticky footer ───────── */}
      <footer className={`relative z-30 border-t border-stone-700/40 bg-stone-950/70 backdrop-blur-md transition-opacity duration-500 ${galleryMode ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-[11px] text-stone-400">
            <Compass className="h-3.5 w-3.5 text-amber-200/70" />
            <span className="font-mono tracking-widest text-amber-200/80">ORIGEN</span>
            <span className="hidden text-stone-600 sm:inline">·</span>
            <span className="hidden sm:inline">Sierra de Albarracín · Teruel · España</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSeason('summer')}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                season === 'summer'
                  ? 'border-amber-300/60 bg-amber-500/15 text-amber-100'
                  : 'border-stone-600/40 text-stone-400 hover:text-stone-200'
              }`}
            >
              Verano
            </button>
            <button
              onClick={() => setSeason('winter')}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                season === 'winter'
                  ? 'border-sky-300/60 bg-sky-500/15 text-sky-100'
                  : 'border-stone-600/40 text-stone-400 hover:text-stone-200'
              }`}
            >
              Invierno
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <button
              onClick={toggleMobileInfo}
              className="flex items-center gap-1 rounded-full border border-stone-600/40 px-2.5 py-1 text-stone-300 transition hover:bg-stone-800/60 hover:text-amber-200 sm:hidden"
              aria-label="Información del símbolo"
            >
              <Info className="h-3.5 w-3.5" /> Símbolo
            </button>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="font-mono text-stone-400">Three.js</span>
              <span className="text-stone-700">·</span>
              <span className="font-mono text-stone-400">R3F</span>
            </span>
            <a
              href="#"
              className="flex items-center gap-1 hover:text-stone-300"
              aria-label="Repositorio"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* ───────── Overlays ───────── */}
      <ShortcutsOverlay />
      <ConceptOverlay />
      <MobileInfoSheet />
      <GuidedTourCard />
      <CompareView />
      <GalleryMode />
      <BookmarksPanel />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function ConceptTag({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'amber' | 'slate' | 'stone';
  onClick?: () => void;
}) {
  const tones = {
    amber: 'border-amber-300/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/60',
    slate: 'border-sky-300/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 hover:border-sky-300/60',
    stone: 'border-stone-300/30 bg-stone-200/10 text-stone-100 hover:bg-stone-200/20 hover:border-stone-300/50',
  } as const;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] tracking-wide backdrop-blur transition ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCard({
  season,
  onClose,
  onConcept,
}: {
  season: 'summer' | 'winter';
  onClose: () => void;
  onConcept: (tag: 'tierra' | 'tiempo' | 'mano') => void;
}) {
  return (
    <div className="relative w-[22rem] max-w-[88vw] overflow-hidden rounded-xl border border-stone-500/30 bg-stone-950/75 p-4 backdrop-blur-md sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/70">
            Símbolo maestro
          </p>
          <h2 className="mt-1 text-base font-semibold text-stone-50 sm:text-lg">
            ORIGEN · Tierra · Tiempo · Mano
          </h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[13px] leading-relaxed text-stone-300">
        Escultura monolítica de piedra caliza inspirada en la sillería antigua
        de la Sierra de Albarracín. Tres volúmenes —{' '}
        <button onClick={() => onConcept('tierra')} className="text-amber-200 underline-offset-2 hover:underline">
          Tierra
        </button>
        ,{' '}
        <button onClick={() => onConcept('tiempo')} className="text-sky-200 underline-offset-2 hover:underline">
          Tiempo
        </button>{' '}
        y{' '}
        <button onClick={() => onConcept('mano')} className="text-stone-100 underline-offset-2 hover:underline">
          Mano
        </button>{' '}
        — ensamblados en un único emblema continuo, con un arco en negativo que abra el centro.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Stat label="Vértices" value="2.8k" />
        <Stat label="Formato" value="GLB 2.0" />
        <Stat label="Material" value="PBR caliza" />
      </div>
      <p className="mt-3 text-[11px] text-stone-500">
        Activo inmutable: <span className="font-mono text-stone-300">ORIGEN_MASTER.glb</span>
        {season === 'summer' ? ' · luz cálida de verano' : ' · luz fría de invierno'}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-700/50 bg-stone-900/50 px-2 py-1.5 text-center">
      <div className="font-mono text-stone-100">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">{label}</div>
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-stone-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-amber-300" />
        <p className="font-mono text-xs tracking-widest">Cargando ORIGEN_MASTER…</p>
      </div>
    </div>
  );
}
