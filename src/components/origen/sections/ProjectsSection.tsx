'use client';
/**
 * ProjectsSection.tsx — architectural projects gallery.
 *
 * A minimal, monumental grid of project placeholders with stone-toned
 * imagery. Each card is spacious — no SaaS card clutter.
 */
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const PROJECTS = [
  {
    title: 'Casa de la Sierra',
    location: 'Albarracín, Teruel',
    year: '2025',
    material: 'Caliza + cristal',
  },
  {
    title: 'Centro de Interpretación',
    location: 'Rodeno, Teruel',
    year: '2024',
    material: 'Piedra natural + acero',
  },
  {
    title: 'Refugio del Tiempo',
    location: 'Frías de Albarracín',
    year: '2024',
    material: 'Caliza + madera',
  },
  {
    title: 'Mirador del Valle',
    location: 'Gea de Albarracín',
    year: '2023',
    material: 'Hormigón + piedra',
  },
];

export function ProjectsSection() {
  return (
    <section id="arquitectura" className="relative bg-stone-950 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 flex items-end justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-200/60">
              Arquitectura
            </p>
            <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-stone-100 sm:text-4xl">
              Proyectos
            </h2>
          </div>
          <span className="hidden font-mono text-[11px] text-stone-600 sm:block">
            04 obras seleccionadas
          </span>
        </motion.div>

        <div className="grid gap-px overflow-hidden border border-stone-800/60 bg-stone-800/40 sm:grid-cols-2">
          {PROJECTS.map((p, i) => (
            <motion.article
              key={p.title}
              className="group relative flex flex-col justify-between bg-stone-950/80 p-8 transition hover:bg-stone-900/60 sm:p-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-stone-600">{p.year}</span>
                  <ArrowUpRight className="h-4 w-4 text-stone-700 transition group-hover:text-amber-200/60" />
                </div>
                <h3 className="mt-6 font-serif text-xl font-light text-stone-100">{p.title}</h3>
                <p className="mt-2 text-[13px] text-stone-500">{p.location}</p>
              </div>
              <div className="mt-12 flex items-center gap-2">
                <span className="h-px w-8 bg-stone-700/60" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-stone-600">
                  {p.material}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
