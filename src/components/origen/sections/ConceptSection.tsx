'use client';
/**
 * ConceptSection.tsx — ORIGEN · TIERRA · TIEMPO · MANO
 *
 * Three concept columns explaining the three volumes that form the ORIGEN
 * emblem. Architectural, spacious, stone-toned — no SaaS cards.
 */
import { Mountain, Clock, Hand } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';
import { motion } from 'framer-motion';

const CONCEPTS = [
  {
    tag: 'TIERRA',
    title: 'Tierra',
    icon: <Mountain className="h-5 w-5" />,
    body: 'El volumen izquierdo. La materia, el lugar, el origen geológico. Caliza de la Sierra de Albarracín asentada como sillería antigua.',
    accent: 'text-amber-200/80',
  },
  {
    tag: 'TIEMPO',
    title: 'Tiempo',
    icon: <Clock className="h-5 w-5" />,
    body: 'El volumen derecho. La estratificación que registra eras; las fisuras que testimonian milenios. La arquitectura que perdura.',
    accent: 'text-sky-200/80',
  },
  {
    tag: 'MANO',
    title: 'Mano',
    icon: <Hand className="h-5 w-5" />,
    body: 'La clave central. El dintel que entrelaza Tierra y Tiempo en un único gesto. La intervención humana, el oficio del cantero.',
    accent: 'text-stone-100/80',
  },
];

export function ConceptSection() {
  const openConcept = useMaterialStore((s) => s.openConcept);
  return (
    <section id="concepto" className="relative bg-stone-950 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-200/60">
            El símbolo
          </p>
          <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-stone-100 sm:text-4xl">
            Tres volúmenes, un origen
          </h2>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
        </motion.div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-stone-800/60 bg-stone-800/40 md:grid-cols-3">
          {CONCEPTS.map((c, i) => (
            <motion.button
              key={c.tag}
              onClick={() => openConcept(c.tag.toLowerCase() as 'tierra' | 'tiempo' | 'mano')}
              className="group relative flex flex-col items-center bg-stone-950/80 p-8 text-center transition hover:bg-stone-900/60 sm:p-12"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-stone-700/50 ${c.accent}`}>
                {c.icon}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-stone-500">
                {c.tag}
              </p>
              <h3 className={`mt-1 font-serif text-xl font-light ${c.accent}`}>{c.title}</h3>
              <p className="mt-4 text-[13px] leading-relaxed text-stone-400">{c.body}</p>
              <span className="mt-6 text-[11px] text-stone-600 transition group-hover:text-amber-200/60">
                Conoce el concepto →
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
