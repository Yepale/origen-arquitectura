'use client';
/**
 * ActionToolbar.tsx — floating action buttons.
 *
 *   • Camera presets (Hero / Front / Side / Top) — top-center segmented control.
 *   • Reset view / Capture / Share / Fullscreen / Shortcuts — a compact
 *     cluster below the presets.
 *
 * Emits transient signals consumed by the camera rig / composition / page.
 */
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Camera,
  Keyboard,
  Share2,
  Maximize,
  Minimize,
  Eye,
  Box,
  Square,
  Mountain,
  GalleryVerticalEnd,
  Columns2,
  Play,
  Bookmark,
} from 'lucide-react';
import { useMaterialStore, type CameraPreset } from '@/3d/materialViewer';

const PRESETS: { id: CameraPreset; label: string; icon: React.ReactNode; kbd: string }[] = [
  { id: 'hero', label: 'Hero', icon: <Mountain className="h-3.5 w-3.5" />, kbd: 'P' },
  { id: 'front', label: 'Frente', icon: <Square className="h-3.5 w-3.5" />, kbd: 'P' },
  { id: 'side', label: 'Perfil', icon: <Box className="h-3.5 w-3.5" />, kbd: 'P' },
  { id: 'top', label: 'Cenital', icon: <Eye className="h-3.5 w-3.5" />, kbd: 'P' },
];

export function ActionToolbar() {
  const resetView = useMaterialStore((s) => s.resetView);
  const capture = useMaterialStore((s) => s.capture);
  const toggleShortcuts = useMaterialStore((s) => s.toggleShortcuts);
  const share = useMaterialStore((s) => s.share);
  const setFullscreen = useMaterialStore((s) => s.setFullscreen);
  const fullscreen = useMaterialStore((s) => s.fullscreen);
  const applyPreset = useMaterialStore((s) => s.applyCameraPreset);
  const currentPreset = useMaterialStore((s) => s.cameraPreset);
  const setGuidedTour = useMaterialStore((s) => s.setGuidedTour);
  const guidedTour = useMaterialStore((s) => s.guidedTour);
  const setCompareView = useMaterialStore((s) => s.setCompareView);
  const compareView = useMaterialStore((s) => s.compareView);
  const setGalleryMode = useMaterialStore((s) => s.setGalleryMode);
  const galleryMode = useMaterialStore((s) => s.galleryMode);
  const toggleBookmarks = useMaterialStore((s) => s.toggleBookmarks);

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-stone-500/40 bg-stone-950/65 text-stone-200 backdrop-blur-md transition hover:bg-stone-800/80 hover:text-amber-200';
  const btnActive =
    'flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/20 text-amber-200 backdrop-blur-md transition hover:bg-amber-500/30';

  return (
    <motion.div
      className="pointer-events-auto flex flex-col items-center gap-2"
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 22 }}
    >
      {/* Camera preset segmented control (desktop only) */}
      <div className="hidden items-center gap-1 rounded-full border border-stone-600/40 bg-stone-950/65 p-1 backdrop-blur-md md:flex">
        {PRESETS.map((p) => {
          const active = currentPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              title={`${p.label} (P)`}
              aria-label={`Vista ${p.label}`}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? 'bg-amber-500/25 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
                  : 'text-stone-400 hover:bg-stone-800/70 hover:text-stone-100'
              }`}
            >
              {p.icon}
              <span className="hidden lg:inline">{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action cluster */}
      <div className="flex items-center gap-2">
        <button onClick={resetView} className={btn} title="Restablecer vista (R)" aria-label="Restablecer vista">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={capture} className={btn} title="Capturar PNG (C)" aria-label="Capturar imagen">
          <Camera className="h-4 w-4" />
        </button>
        <button
          onClick={() => setGuidedTour(!guidedTour)}
          className={guidedTour ? btnActive : btn}
          title="Recorrido guiado (N)"
          aria-label="Recorrido guiado"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCompareView(!compareView)}
          className={compareView ? btnActive : btn}
          title="Comparar estaciones (X)"
          aria-label="Comparar estaciones"
        >
          <Columns2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setGalleryMode(!galleryMode)}
          className={galleryMode ? btnActive : btn}
          title="Modo galería (G)"
          aria-label="Modo galería"
        >
          <GalleryVerticalEnd className="h-4 w-4" />
        </button>
        <button onClick={share} className={btn} title="Copiar enlace (L)" aria-label="Compartir enlace">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={toggleBookmarks} className={btn} title="Vistas guardadas (K)" aria-label="Vistas guardadas">
          <Bookmark className="h-4 w-4" />
        </button>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className={btn}
          title={fullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa (F)'}
          aria-label="Pantalla completa"
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
        <button onClick={toggleShortcuts} className={btn} title="Atajos (H)" aria-label="Atajos">
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
