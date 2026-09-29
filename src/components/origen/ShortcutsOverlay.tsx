'use client';
/**
 * ShortcutsOverlay.tsx — keyboard shortcut reference modal.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['1', '2', '3'], label: 'Nivel de detalle (Master / LOD 1 / LOD 2)' },
  { keys: ['P'], label: 'Vista cinematográfica (Hero / Frente / Perfil / Cenital)' },
  { keys: ['T'], label: 'Recorrido cinematográfico automático' },
  { keys: ['N'], label: 'Recorrido guiado (auto-tour + narración)' },
  { keys: ['G'], label: 'Modo galería (chrome mínimo)' },
  { keys: ['X'], label: 'Comparar estaciones (verano | invierno)' },
  { keys: ['W'], label: 'Wireframe' },
  { keys: ['E'], label: 'Modo técnico (aristas)' },
  { keys: ['V'], label: 'Color de vértice (piedra)' },
  { keys: ['S'], label: 'Cambiar estación (Verano / Invierno)' },
  { keys: ['A'], label: 'Auto-orbita' },
  { keys: ['B'], label: 'Panorama de fondo' },
  { keys: ['K'], label: 'Vistas guardadas (bookmarks)' },
  { keys: ['M'], label: 'Audio ambiental (viento)' },
  { keys: ['R'], label: 'Restablecer vista' },
  { keys: ['C'], label: 'Capturar PNG' },
  { keys: ['L'], label: 'Copiar enlace del estado actual' },
  { keys: ['F'], label: 'Pantalla completa' },
  { keys: ['H', '?'], label: 'Esta ayuda' },
  { keys: ['Esc'], label: 'Cerrar superposiciones / salir pantalla completa' },
];

export function ShortcutsOverlay() {
  const show = useMaterialStore((s) => s.showShortcuts);
  const toggle = useMaterialStore((s) => s.toggleShortcuts);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
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
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-wide">
                <Keyboard className="h-4 w-4 text-amber-300" />
                Atajos de teclado
              </h2>
              <button
                onClick={toggle}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {SHORTCUTS.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b border-stone-800/60 pb-2 last:border-0"
                >
                  <span className="text-sm text-stone-300">{row.label}</span>
                  <span className="flex shrink-0 gap-1">
                    {row.keys.map((k) => (
                      <kbd
                        key={k}
                        className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-stone-600/60 bg-stone-800/80 px-1.5 font-mono text-[11px] text-amber-200 shadow-[0_1px_0_rgba(0,0,0,0.4)]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-stone-500">
              Los atajos no interfieren con la escritura en campos de texto.
              Pulsa <kbd className="rounded bg-stone-800 px-1 font-mono text-amber-200">Esc</kbd> para cerrar.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
