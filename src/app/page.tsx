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
 */
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain,
  Clock,
  Hand,
  Info,
  X,
  ChevronRight,
  Github,
  Box,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMaterialStore } from '@/3d/materialViewer';
import { useIsMobile } from '@/hooks/use-mobile';

// Three.js Canvas must be client-only (no SSR).
const OrigenViewer = dynamic(
  () => import('@/components/origen/OrigenViewer').then((m) => m.OrigenViewer),
  { ssr: false, loading: () => <ViewerLoading /> }
);
const ControlPanel = dynamic(
  () => import('@/components/origen/ControlPanel').then((m) => m.ControlPanel),
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
  const isMobile = useIsMobile();
  // Panels default open on desktop, closed on mobile. The override stores any
  // explicit user choice; otherwise the open state derives from isMobile during
  // render (no set-state-in-effect).
  const [override, setOverride] = useState<{ panel?: boolean; info?: boolean }>({});
  const panelOpen = override.panel ?? !isMobile;
  const infoOpen = override.info ?? !isMobile;
  const setPanelOpen = (v: boolean) => setOverride((o) => ({ ...o, panel: v }));
  const setInfoOpen = (v: boolean) => setOverride((o) => ({ ...o, info: v }));

  const landscape = season === 'summer' ? SUMMER_LANDSCAPE : WINTER_LANDSCAPE;
  const portrait = season === 'summer' ? SUMMER_PORTRAIT : WINTER_PORTRAIT;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-stone-950 text-stone-100">
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
      </div>

      {/* ───────── Header ───────── */}
      <header className="relative z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-200/40 bg-stone-900/60 backdrop-blur-sm">
            <Mountain className="h-5 w-5 text-amber-200" />
          </div>
          <div className="leading-tight">
            <h1 className="font-mono text-lg font-semibold tracking-[0.2em] text-stone-50 sm:text-xl">
              ORIGEN
            </h1>
            <p className="text-[10px] uppercase tracking-[0.32em] text-amber-200/80 sm:text-[11px]">
              Estudio de arquitectura
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <ConceptTag icon={<Mountain className="h-3 w-3" />} label="Tierra" tone="amber" />
          <ConceptTag icon={<Clock className="h-3 w-3" />} label="Tiempo" tone="slate" />
          <ConceptTag icon={<Hand className="h-3 w-3" />} label="Mano" tone="stone" />
        </div>
        <Badge
          variant="outline"
          className="hidden border-stone-500/50 bg-stone-900/60 text-stone-300 backdrop-blur sm:inline-flex"
        >
          <Box className="mr-1 h-3 w-3" /> glTF 2.0 · GLB
        </Badge>
      </header>

      {/* ───────── Main viewer ───────── */}
      <main className="relative z-20 flex-1">
        <div className="absolute inset-0">
          <OrigenViewer />
        </div>

        {/* Control panel — bottom sheet on mobile, right side on desktop */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-30 flex justify-center px-3 sm:inset-x-auto sm:inset-y-0 sm:bottom-auto sm:right-0 sm:items-center sm:justify-end sm:p-4">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-20 hidden justify-start p-3 sm:flex sm:p-4">
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
                  <InfoCard season={season} onClose={() => setInfoOpen(false)} />
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
      </main>

      {/* ───────── Sticky footer ───────── */}
      <footer className="relative z-30 border-t border-stone-700/40 bg-stone-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-[11px] text-stone-400">
            <span className="font-mono tracking-widest text-amber-200/80">ORIGEN</span>
            <span className="hidden sm:inline">·</span>
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
            <span className="hidden items-center gap-1 sm:flex">
              <ChevronRight className="h-3 w-3" /> Three.js · React Three Fiber
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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function ConceptTag({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'amber' | 'slate' | 'stone';
}) {
  const tones = {
    amber: 'border-amber-300/40 bg-amber-500/10 text-amber-100',
    slate: 'border-sky-300/40 bg-sky-500/10 text-sky-100',
    stone: 'border-stone-300/30 bg-stone-200/10 text-stone-100',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] tracking-wide backdrop-blur ${tones[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}

function InfoCard({
  season,
  onClose,
}: {
  season: 'summer' | 'winter';
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-stone-500/30 bg-stone-950/70 p-4 backdrop-blur-md sm:p-5">
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
        <span className="text-amber-200">Tierra</span>,{' '}
        <span className="text-sky-200">Tiempo</span> y{' '}
        <span className="text-stone-100">Mano</span> — ensamblados en un único
        emblema continuo, con un arco en negativo que abra el centro.
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
