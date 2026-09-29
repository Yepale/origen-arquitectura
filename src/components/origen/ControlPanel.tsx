'use client';
/**
 * ControlPanel.tsx — material viewer / runtime inspector for ORIGEN.
 *
 * Lets the visitor:
 *  - toggle wireframe / vertex colors / backdrop / auto-rotate
 *  - scrub roughness override + environment intensity
 *  - pick LOD (master / lod1 / lod2)
 *  - switch season (summer / winter)
 *  - reset view (camera) + capture PNG + open shortcuts overlay
 *  - reset to production defaults
 *
 * The panel ONLY mutates the Zustand material store, which the runtime
 * applies to the loaded ORIGEN mesh's material parameters. Geometry is
 * never touched. Live telemetry (fps / draw calls / triangles) is shown
 * in the header strip.
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { useMaterialStore } from '@/3d/materialViewer';
import type { LOD } from '@/3d/masterSymbol';
import { MODEL_LIBRARY, MODEL_IDS, type ModelId } from '@/3d/models';
import { MATERIAL_PRESETS, type MaterialPreset } from '@/3d/materialViewer';
import {
  RotateCw,
  Eye,
  Boxes,
  Sun,
  Snowflake,
  Sparkles,
  RotateCcw,
  Grid3x3,
  Palette,
  Camera,
  Keyboard,
  Activity,
  Triangle,
  Gauge,
  Spline,
  Play,
  Volume2,
  Layers,
  Gem,
  Wand2,
} from 'lucide-react';

export function ControlPanel() {
  const s = useMaterialStore();

  return (
    <Card className="w-[340px] max-w-[92vw] border-stone-600/40 bg-stone-950/80 backdrop-blur-xl text-stone-100 shadow-2xl ring-1 ring-stone-700/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-stone-50">
            <Boxes className="h-4 w-4 text-amber-400" />
            Visor del símbolo
          </CardTitle>
          <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {s.loaded ? 'CARGADO' : 'CARGANDO'}
          </span>
        </div>
        <CardDescription className="font-mono text-[10px] tracking-wide text-stone-400">
          ORIGEN_MASTER · glTF 2.0 · inmutable
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Live telemetry mini-strip */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-stone-700/50 bg-stone-900/50 p-2 font-mono text-[10px]">
          <Tel icon={<Activity className={`h-3 w-3 ${s.fps > 0 ? fpsColor(s.fps) : 'text-stone-500'}`} />} value={s.loaded && s.fps > 0 ? String(s.fps) : '—'} label="fps" valueClass={s.fps > 0 ? fpsColor(s.fps) : 'text-stone-500'} />
          <Tel icon={<Gauge className="h-3 w-3 text-stone-500" />} value={s.loaded ? String(s.drawCalls) : '—'} label="calls" />
          <Tel icon={<Triangle className="h-3 w-3 text-stone-500" />} value={s.loaded ? formatK(s.triangles) : '—'} label="tris" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Vista" onClick={s.resetView} kbd="R" />
          <ActionButton icon={<Camera className="h-4 w-4" />} label="Captura" onClick={s.capture} kbd="C" />
          <ActionButton icon={<Keyboard className="h-4 w-4" />} label="Atajos" onClick={s.toggleShortcuts} kbd="H" />
        </div>

        <Separator className="bg-stone-700/50" />

        {/* Model library */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            <Layers className="h-3 w-3" /> Modelo
          </Label>
          <ToggleGroup
            type="single"
            value={s.modelId}
            onValueChange={(v) => v && s.setModelId(v as ModelId)}
            className="grid gap-2"
          >
            {MODEL_IDS.map((id) => {
              const entry = MODEL_LIBRARY[id];
              return (
                <ToggleGroupItem
                  key={id}
                  value={id}
                  className="flex items-center justify-start gap-2 border border-stone-700/50 px-3 py-2 text-xs data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 hover:bg-stone-800"
                >
                  <Boxes className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-left">{entry.name}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <p className="font-mono text-[10px] text-stone-500">
            {MODEL_LIBRARY[s.modelId].description}
          </p>
        </div>

        <Separator className="bg-stone-700/50" />

        {/* Season */}
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            Estación
          </Label>
          <ToggleGroup
            type="single"
            value={s.season}
            onValueChange={(v) => v && s.setSeason(v as any)}
            className="grid grid-cols-2 gap-2"
          >
            <ToggleGroupItem
              value="summer"
              className="text-xs data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 border border-stone-700/50 hover:bg-stone-800"
            >
              <Sun className="h-3.5 w-3.5 mr-1.5" /> Verano
            </ToggleGroupItem>
            <ToggleGroupItem
              value="winter"
              className="text-xs data-[state=on]:bg-sky-500/20 data-[state=on]:text-sky-200 border border-stone-700/50 hover:bg-stone-800"
            >
              <Snowflake className="h-3.5 w-3.5 mr-1.5" /> Invierno
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator className="bg-stone-700/50" />

        {/* LOD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
              Nivel de detalle
            </Label>
            <span className="font-mono text-[10px] text-stone-500">LOD</span>
          </div>
          <ToggleGroup
            type="single"
            value={s.lod}
            onValueChange={(v) => v && s.setLod(v as LOD)}
            className="grid grid-cols-3 gap-2"
          >
            <ToggleGroupItem value="master" className="text-xs border border-stone-700/50 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 hover:bg-stone-800">Master</ToggleGroupItem>
            <ToggleGroupItem value="lod1" className="text-xs border border-stone-700/50 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 hover:bg-stone-800">LOD 1</ToggleGroupItem>
            <ToggleGroupItem value="lod2" className="text-xs border border-stone-700/50 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 hover:bg-stone-800">LOD 2</ToggleGroupItem>
          </ToggleGroup>
          <p className="font-mono text-[10px] text-stone-500">
            2.8k · 1.8k · 1.2k vértices
          </p>
        </div>

        <Separator className="bg-stone-700/50" />

        {/* Material toggles */}
        <div className="space-y-3">
          <ToggleRow icon={<Grid3x3 className="h-3.5 w-3.5" />} label="Wireframe" kbd="W" checked={s.wireframe} onCheckedChange={s.setWireframe} />
          <ToggleRow icon={<Spline className="h-3.5 w-3.5" />} label="Modo técnico (aristas)" kbd="E" checked={s.showEdges} onCheckedChange={s.setShowEdges} />
          <ToggleRow icon={<Palette className="h-3.5 w-3.5" />} label="Color vértice (piedra)" kbd="V" checked={s.vertexColors} onCheckedChange={s.setVertexColors} />
          <ToggleRow icon={<Eye className="h-3.5 w-3.5" />} label="Panorama de fondo" kbd="B" checked={s.showBackdrop} onCheckedChange={s.setShowBackdrop} />
          <ToggleRow icon={<RotateCw className="h-3.5 w-3.5" />} label="Auto-orbita" kbd="A" checked={s.autoRotate} onCheckedChange={s.setAutoRotate} />
          <ToggleRow icon={<Play className="h-3.5 w-3.5" />} label="Recorrido cinematográfico" kbd="T" checked={s.autoTour} onCheckedChange={s.setAutoTour} />
          <ToggleRow icon={<Volume2 className="h-3.5 w-3.5" />} label="Audio ambiental" kbd="M" checked={s.audioEnabled} onCheckedChange={s.setAudioEnabled} />
          <ToggleRow icon={<Wand2 className="h-3.5 w-3.5" />} label="Postproceso (bloom)" kbd="O" checked={s.postprocessing} onCheckedChange={s.setPostprocessing} />
        </div>

        <Separator className="bg-stone-700/50" />

        {/* Material preset library */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
            <Gem className="h-3 w-3" /> Material
          </Label>
          <ToggleGroup
            type="single"
            value={s.materialPreset}
            onValueChange={(v) => v && s.setMaterialPreset(v as MaterialPreset)}
            className="grid grid-cols-4 gap-1.5"
          >
            {(Object.keys(MATERIAL_PRESETS) as MaterialPreset[]).map((p) => {
              const preset = MATERIAL_PRESETS[p];
              return (
                <ToggleGroupItem
                  key={p}
                  value={p}
                  className="flex flex-col items-center gap-1 border border-stone-700/50 px-1 py-2 text-[10px] data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-200 hover:bg-stone-800"
                  title={`${preset.label} · roughness ${preset.roughness}`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-stone-600/40"
                    style={{ backgroundColor: preset.color }}
                  />
                  {preset.label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>

        <Separator className="bg-stone-700/50" />

        {/* Roughness */}
        <SliderRow
          label="Asperieza"
          kbd="—"
          value={s.roughnessOverride === null ? 0.86 : s.roughnessOverride}
          display={s.roughnessOverride === null ? 'auto · 0.86' : s.roughnessOverride.toFixed(2)}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => s.setRoughness(v)}
        />
        {s.roughnessOverride !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="-mt-3 h-6 px-2 text-[11px] text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"
            onClick={() => s.setRoughness(null)}
          >
            Restaurar predeterminado
          </Button>
        )}

        {/* Env intensity */}
        <SliderRow
          label="Intensidad entorno"
          kbd="—"
          value={s.envIntensity}
          display={s.envIntensity.toFixed(2)}
          min={0}
          max={1.5}
          step={0.02}
          onChange={(v) => s.setEnvIntensity(v)}
        />

        <Separator className="bg-stone-700/50" />

        <Button
          variant="outline"
          size="sm"
          className="w-full border-stone-600/60 bg-stone-900/40 text-stone-300 hover:bg-stone-800 hover:text-amber-200"
          onClick={() => s.reset()}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restablecer ajustes
        </Button>

        <p className="flex items-start gap-1.5 text-[10px] leading-tight text-stone-500">
          <Sparkles className="mt-px h-3 w-3 shrink-0 text-amber-500/70" />
          <span>
            <span className="font-mono text-stone-400">ORIGEN_MASTER.glb</span> es inmutable. Los ajustes sólo modifican parámetros del material en tiempo de ejecución.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function Tel({
  icon, value, label, valueClass = 'text-stone-200',
}: { icon: React.ReactNode; value: string; label: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">{icon}<span className={valueClass}>{value}</span></div>
      <span className="text-[9px] uppercase tracking-wider text-stone-600">{label}</span>
    </div>
  );
}

function ActionButton({
  icon, label, onClick, kbd,
}: { icon: React.ReactNode; label: string; onClick: () => void; kbd?: string }) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="group relative flex flex-col items-center gap-1 rounded-lg border border-stone-700/50 bg-stone-900/50 py-2 text-stone-300 transition hover:border-amber-400/50 hover:bg-stone-800/70 hover:text-amber-200"
          >
            {icon}
            <span className="text-[10px] tracking-wide">{label}</span>
            {kbd && (
              <kbd className="absolute right-1 top-1 rounded bg-stone-800 px-1 font-mono text-[8px] text-stone-500 group-hover:text-amber-400/70">
                {kbd}
              </kbd>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="border-stone-700 bg-stone-900 text-stone-200">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ToggleRow({
  icon, label, kbd, checked, onCheckedChange,
}: {
  icon: React.ReactNode; label: string; kbd?: string;
  checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="flex items-center gap-2 text-sm text-stone-200">
        <span className="text-stone-400">{icon}</span>
        {label}
        {kbd && (
          <kbd className="rounded border border-stone-700/60 bg-stone-800/70 px-1 font-mono text-[9px] text-stone-500">
            {kbd}
          </kbd>
        )}
      </Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SliderRow({
  label, kbd, value, display, min, max, step, onChange,
}: {
  label: string; kbd?: string; value: number; display: string;
  min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
          {label}
          {kbd && (
            <kbd className="rounded border border-stone-700/60 bg-stone-800/70 px-1 font-mono text-[9px] text-stone-500">
              {kbd}
            </kbd>
          )}
        </Label>
        <span className="font-mono text-xs tabular-nums text-stone-300">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="py-1"
      />
    </div>
  );
}

function fpsColor(fps: number) {
  if (fps >= 50) return 'text-emerald-300';
  if (fps >= 30) return 'text-amber-300';
  return 'text-rose-300';
}

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
