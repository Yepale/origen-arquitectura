'use client';
/**
 * MobileInfoSheet.tsx — bottom sheet (mobile only) showing the ORIGEN
 * symbol description + concept buttons. Opened via the footer info button
 * (controlled by `showMobileInfo` in the store) so it's reachable on small
 * screens where the desktop info card is hidden.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Mountain, Clock, Hand, X, Info } from 'lucide-react';
import { useMaterialStore, type ConceptTag } from '@/3d/materialViewer';

export function MobileInfoSheet() {
  const open = useMaterialStore((s) => s.showMobileInfo);
  const toggle = useMaterialStore((s) => s.toggleMobileInfo);
  const season = useMaterialStore((s) => s.season);
  const openConcept = useMaterialStore((s) => s.openConcept);

  const conceptBtn = (tag: ConceptTag, label: string, icon: React.ReactNode, tone: string) => (
    <button
      onClick={() => {
        toggle();
        openConcept(tag);
      }}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] transition ${tone}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggle}
        >
          <motion.div
            className="w-full rounded-t-2xl border-t border-stone-600/40 bg-stone-950/95 p-5 pb-7 text-stone-100 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-700" />
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/70">
                  Símbolo maestro
                </p>
                <h2 className="mt-1 text-lg font-semibold">ORIGEN · Tierra · Tiempo · Mano</h2>
              </div>
              <button onClick={toggle} className="rounded-md p-1 text-stone-400 hover:bg-stone-800/60 hover:text-stone-100" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-stone-300">
              Escultura monolítica de piedra caliza inspirada en la sillería antigua de la
              Sierra de Albarracín. Tres volúmenes ensamblados en un único emblema continuo,
              con un arco en negativo que abra el centro.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              {conceptBtn('tierra', 'Tierra', <Mountain className="h-4 w-4" />, 'border-amber-300/40 bg-amber-500/10 text-amber-100')}
              {conceptBtn('tiempo', 'Tiempo', <Clock className="h-4 w-4" />, 'border-sky-300/40 bg-sky-500/10 text-sky-100')}
              {conceptBtn('mano', 'Mano', <Hand className="h-4 w-4" />, 'border-stone-300/30 bg-stone-200/10 text-stone-100')}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <Stat label="Vértices" value="2.8k" />
              <Stat label="Formato" value="GLB 2.0" />
              <Stat label="Material" value="PBR caliza" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-500">
              <Info className="h-3 w-3 text-amber-200/70" />
              Activo inmutable: <span className="font-mono text-stone-300">ORIGEN_MASTER.glb</span>
              {season === 'summer' ? ' · luz cálida' : ' · luz fría'}.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
