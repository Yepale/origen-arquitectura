'use client';
/**
 * ContactSection.tsx — contact / footer for ORIGEN.
 *
 * Minimal, monumental. Stone-toned. No form clutter — just the essentials:
 * email, location, social. The silence is the point.
 */
import { motion } from 'framer-motion';
import { MapPin, Mail, ArrowUp } from 'lucide-react';

export function ContactSection() {
  return (
    <section id="contacto" className="relative bg-stone-900/60 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber-200/60">
            Contacto
          </p>
          <h2 className="mt-6 font-serif text-3xl font-light tracking-wide text-stone-100 sm:text-4xl">
            Construyamos algo permanente
          </h2>
          <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

          <a
            href="mailto:estudio@origen.arquitectura"
            className="mt-12 inline-flex items-center gap-3 font-serif text-xl text-stone-200 transition hover:text-amber-200"
          >
            <Mail className="h-5 w-5" />
            estudio@origen.arquitectura
          </a>

          <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-stone-500">
            <MapPin className="h-4 w-4 text-amber-200/50" />
            Sierra de Albarracín · Teruel · España
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-24 border-t border-stone-800/60 pt-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-[11px] text-stone-600">
            <span className="font-mono tracking-widest text-amber-200/50">ORIGEN</span>
            <span>·</span>
            <span>Estudio de arquitectura</span>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1.5 text-[11px] text-stone-600 transition hover:text-stone-300"
          >
            <ArrowUp className="h-3 w-3" /> Volver al origen
          </button>
        </div>
      </footer>
    </section>
  );
}
