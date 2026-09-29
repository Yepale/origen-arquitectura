'use client';
/**
 * ConceptOverlay.tsx — Tierra · Tiempo · Mano concept explainer.
 *
 * A small modal that explains one of the three conceptual volumes that make
 * up the ORIGEN emblem. The concepts belong to the visual design; the
 * runtime mesh stays a single immutable ORIGEN_SYMBOL. This overlay is
 * purely editorial / pedagogical.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mountain, Clock, Hand } from 'lucide-react';
import { useMaterialStore, type ConceptTag } from '@/3d/materialViewer';

const CONCEPTS: Record<
  ConceptTag,
  {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
    ring: string;
    body: string;
    keywords: string[];
  }
> = {
  tierra: {
    title: 'Tierra',
    subtitle: 'El volumen de la piedra',
    icon: <Mountain className="h-5 w-5" />,
    accent: 'text-amber-200',
    ring: 'ring-amber-400/40',
    body: 'El volumen izquierdo del emblema. Caliza cálida de la Sierra de Albarracín, asentada como sillería antigua. Representa la materia, el lugar, el origen geológico del que brota toda arquitectura.',
    keywords: ['Materia', 'Lugar', 'Cimiento', 'Caliza'],
  },
  tiempo: {
    title: 'Tiempo',
    subtitle: 'La estratificación geológica',
    icon: <Clock className="h-5 w-5" />,
    accent: 'text-sky-200',
    ring: 'ring-sky-400/40',
    body: 'El volumen derecho del emblema. Capas sedimentarias que registran eras; fisuras que testimonian milenios. La arquitectura que perdura dialoga con el tiempo que la modela.',
    keywords: ['Era', 'Estrato', 'Patina', 'Permanencia'],
  },
  mano: {
    title: 'Mano',
    subtitle: 'La clave del ensamblaje',
    icon: <Hand className="h-5 w-5" />,
    accent: 'text-stone-100',
    ring: 'ring-stone-300/40',
    body: 'El dintel central — la clave de bóveda — que entrelaza Tierra y Tiempo en un único gesto. Es la intervención humana, el oficio del cantero, el proyecto que convierte materia y tiempo en un símbolo.',
    keywords: ['Oficio', 'Clave', 'Gesto', 'Proyecto'],
  },
};

export function ConceptOverlay() {
  const show = useMaterialStore((s) => s.showConcept);
  const tag = useMaterialStore((s) => s.conceptTag);
  const close = useMaterialStore((s) => s.closeConcept);
  const c = tag ? CONCEPTS[tag] : null;

  return (
    <AnimatePresence>
      {show && c && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className={`w-[min(92vw,30rem)] rounded-2xl border border-stone-600/40 bg-stone-950/90 p-6 text-stone-100 shadow-2xl ring-1 ${c.ring}`}
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border border-stone-600/50 bg-stone-900/70 ${c.accent}`}
                >
                  {c.icon}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-stone-400">
                    {c.subtitle}
                  </p>
                  <h2 className={`text-2xl font-semibold tracking-wide ${c.accent}`}>
                    {c.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={close}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-stone-300">{c.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-stone-700/60 bg-stone-900/60 px-2.5 py-0.5 text-[11px] text-stone-300"
                >
                  {k}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-stone-800/60 bg-stone-900/40 p-3 text-[11px] text-stone-500">
              <span className="font-mono text-stone-300">ORIGEN_MASTER.glb</span> es un único
              símbolo inmutable. Tierra · Tiempo · Mano son conceptos del diseño visual, no
              objetos en tiempo de ejecución.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
