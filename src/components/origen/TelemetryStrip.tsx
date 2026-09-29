'use client';
/**
 * TelemetryStrip.tsx — live FPS / draw calls / triangles readout.
 *
 * A compact monospaced strip shown in the header on desktop. Updated from
 * the R3F render loop via the material store telemetry.
 */
import { Gauge, Activity, Triangle } from 'lucide-react';
import { useMaterialStore } from '@/3d/materialViewer';

export function TelemetryStrip() {
  const fps = useMaterialStore((s) => s.fps);
  const drawCalls = useMaterialStore((s) => s.drawCalls);
  const triangles = useMaterialStore((s) => s.triangles);
  const loaded = useMaterialStore((s) => s.loaded);

  const fpsColor = fps >= 50 ? 'text-emerald-300' : fps >= 30 ? 'text-amber-300' : 'text-rose-300';
  const fpsLabel = loaded && fps > 0 ? String(fps) : '—';
  const fpsLabelColor = fps > 0 ? fpsColor : 'text-stone-500';

  return (
    <div className="hidden items-center gap-3 rounded-full border border-stone-700/40 bg-stone-950/60 px-3 py-1 font-mono text-[10px] text-stone-400 backdrop-blur md:flex">
      <span className="flex items-center gap-1" title="FPS">
        <Activity className={`h-3 w-3 ${fpsLabelColor}`} />
        <span className={fpsLabelColor}>{fpsLabel}</span>
        <span className="text-stone-600">fps</span>
      </span>
      <span className="h-3 w-px bg-stone-700/50" />
      <span className="flex items-center gap-1" title="Draw calls">
        <Gauge className="h-3 w-3 text-stone-500" />
        <span className="text-stone-300">{loaded ? drawCalls : '—'}</span>
      </span>
      <span className="h-3 w-px bg-stone-700/50" />
      <span className="flex items-center gap-1" title="Triángulos">
        <Triangle className="h-3 w-3 text-stone-500" />
        <span className="text-stone-300">{loaded ? formatK(triangles) : '—'}</span>
      </span>
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
