'use client';
/**
 * BookmarksPanel.tsx — saved views panel.
 *
 * Lets the visitor snapshot the current view + material state into a named
 * bookmark (persisted to localStorage via the store) and re-apply any saved
 * bookmark with a single click. Each bookmark restores: camera orbit
 * (azimuth/elevation/distance), preset, season, LOD, wireframe/edges/vertex-
 * colors, roughness, env intensity, auto-rotate, backdrop, audio.
 *
 * Opened via the bookmark button (B key) in the action cluster; Esc closes.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, Plus, Camera, Clock } from 'lucide-react';
import { useState } from 'react';
import { useMaterialStore, type OrigenBookmark } from '@/3d/materialViewer';

export function BookmarksPanel() {
  const open = useMaterialStore((s) => s.showBookmarks);
  const toggle = useMaterialStore((s) => s.toggleBookmarks);
  const bookmarks = useMaterialStore((s) => s.bookmarks);
  const saveBookmark = useMaterialStore((s) => s.saveBookmark);
  const deleteBookmark = useMaterialStore((s) => s.deleteBookmark);
  const applyBookmark = useMaterialStore((s) => s.applyBookmark);
  const [name, setName] = useState('');

  const handleSave = () => {
    saveBookmark(name.trim() || `Vista ${bookmarks.length + 1}`);
    setName('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggle}
        >
          <motion.div
            className="w-[min(92vw,30rem)] rounded-2xl border border-stone-600/40 bg-stone-950/90 p-5 text-stone-100 shadow-2xl"
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Bookmark className="h-4 w-4 text-amber-300" />
                Vistas guardadas
              </h2>
              <button
                onClick={toggle}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Save current view */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                placeholder="Nombre de la vista…"
                className="flex-1 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-400/50"
              />
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/25"
              >
                <Plus className="h-4 w-4" /> Guardar
              </button>
            </div>

            {/* Bookmarks list */}
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-stone-500">
                <Camera className="h-8 w-8 text-stone-600" />
                <p className="text-sm">Aún no hay vistas guardadas.</p>
                <p className="text-[11px] text-stone-600">Ajusta la cámara y los materiales, luego pulsa “Guardar”.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {bookmarks.map((bm) => (
                  <BookmarkRow
                    key={bm.id}
                    bm={bm}
                    onApply={() => {
                      applyBookmark(bm.id);
                      toggle();
                    }}
                    onDelete={() => deleteBookmark(bm.id)}
                  />
                ))}
              </div>
            )}

            <p className="mt-4 text-[11px] text-stone-500">
              Las vistas se guardan en este navegador (localStorage). Incluyen cámara, estación, LOD y materiales.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BookmarkRow({
  bm,
  onApply,
  onDelete,
}: {
  bm: OrigenBookmark;
  onApply: () => void;
  onDelete: () => void;
}) {
  const seasonLabel = bm.season === 'summer' ? 'Verano' : 'Invierno';
  const date = new Date(bm.createdAt);
  const timeStr = date.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-stone-700/50 bg-stone-900/50 p-3 transition hover:border-amber-400/40 hover:bg-stone-800/50">
      <button onClick={onApply} className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-100">{bm.name}</span>
          <span className="rounded-full border border-stone-700/60 px-1.5 py-0.5 font-mono text-[9px] uppercase text-stone-400">
            {bm.cameraPreset}
          </span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${bm.season === 'summer' ? 'border-amber-400/40 text-amber-200' : 'border-sky-400/40 text-sky-200'}`}>
            {seasonLabel}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-500">
          <Clock className="h-2.5 w-2.5" />
          {timeStr}
          <span className="text-stone-700">·</span>
          <span className="font-mono">d={bm.orbit.distance.toFixed(1)}</span>
        </div>
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-md p-1.5 text-stone-500 transition hover:bg-rose-500/15 hover:text-rose-300"
        aria-label="Eliminar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
