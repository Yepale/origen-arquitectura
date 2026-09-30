'use client';
/**
 * PhilosophySection.tsx — architectural philosophy of ORIGEN.
 *
 * A quiet, spacious text section. Stone-toned, serif, monumental — the
 * antithesis of a SaaS feature grid.
 */
import { motion } from 'framer-motion';

export function PhilosophySection() {
  return (
    <section id="filosofia" className="relative overflow-hidden bg-stone-900/40 px-6 py-24 sm:py-32">
      {/* Subtle stone texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-200/60">
            Filosofía
          </p>
          <h2 className="mt-6 font-serif text-2xl font-light leading-relaxed tracking-wide text-stone-100 sm:text-3xl">
            No construemos edificios.
            <br />
            Construimos <span className="text-amber-200/90">permanencia</span>.
          </h2>
          <div className="mt-8 space-y-6 text-[15px] leading-loose text-stone-400">
            <p>
              ORIGEN nace de la Sierra de Albarracín. De su piedra caliza, de su
              silencio, de la luz que modela los cantos al atardecer. Cada proyecto
              comienza aquí: en la materia, en el lugar, en el tiempo geológico que
              precede a toda arquitectura.
            </p>
            <p>
              Trabajamos con la piedra como los canteros antiguos: con precisión,
              con paciencia, con respeto por el material. La mano no impone forma;
              revela la forma que la materia ya contiene. El resultado no es un
              objeto, sino un origen — el punto donde tierra, tiempo y oficio
              convergen en un único gesto arquitectónico.
            </p>
            <p>
              Arquitectura contemporánea, sí. Pero arraigada. Permanente.
              Como la sierra que la inspira.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
