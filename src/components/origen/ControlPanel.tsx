'use client';
/**
 * ControlPanel.tsx — material viewer / runtime inspector for ORIGEN.
 *
 * Lets the visitor:
 *  - toggle wireframe / vertex colors
 *  - scrub roughness override
 *  - adjust environment map intensity
 *  - pick LOD (master / lod1 / lod2)
 *  - switch season (summer / winter) — changes lights, fog, backdrop
 *  - toggle auto-rotate + backdrop
 *  - reset to production defaults
 *
 * The panel ONLY mutates the Zustand material store, which the runtime
 * applies to the loaded ORIGEN mesh's material parameters. Geometry is
 * never touched.
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { useMaterialStore } from '@/3d/materialViewer';
import type { LOD } from '@/3d/masterSymbol';
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
} from 'lucide-react';

export function ControlPanel() {
  const s = useMaterialStore();

  return (
    <Card className="w-[320px] max-w-[88vw] border-stone-300/40 bg-stone-50/80 backdrop-blur-md dark:bg-stone-900/70 dark:border-stone-700/50 shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-stone-800 dark:text-stone-100">
          <Boxes className="h-4 w-4 text-amber-700 dark:text-amber-500" />
          Visor del símbolo
        </CardTitle>
        <CardDescription className="text-stone-600 dark:text-stone-400">
          ORIGEN_MASTER · glTF 2.0 · inmutable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Season */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
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
              className="data-[state=on]:bg-amber-100 data-[state=on]:text-amber-900 dark:data-[state=on]:bg-amber-900/40 dark:data-[state=on]:text-amber-200"
            >
              <Sun className="h-3.5 w-3.5 mr-1.5" /> Verano
            </ToggleGroupItem>
            <ToggleGroupItem
              value="winter"
              className="data-[state=on]:bg-sky-100 data-[state=on]:text-sky-900 dark:data-[state=on]:bg-sky-900/40 dark:data-[state=on]:text-sky-200"
            >
              <Snowflake className="h-3.5 w-3.5 mr-1.5" /> Invierno
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        {/* LOD */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Nivel de detalle
          </Label>
          <ToggleGroup
            type="single"
            value={s.lod}
            onValueChange={(v) => v && s.setLod(v as LOD)}
            className="grid grid-cols-3 gap-2"
          >
            <ToggleGroupItem value="master" className="text-xs">Master</ToggleGroupItem>
            <ToggleGroupItem value="lod1" className="text-xs">LOD 1</ToggleGroupItem>
            <ToggleGroupItem value="lod2" className="text-xs">LOD 2</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[11px] text-stone-500 dark:text-stone-500">
            2.8k · 1.8k · 1.2k vértices
          </p>
        </div>

        <Separator />

        {/* Material toggles */}
        <div className="space-y-3">
          <ToggleRow
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
            label="Wireframe"
            checked={s.wireframe}
            onCheckedChange={s.setWireframe}
          />
          <ToggleRow
            icon={<Palette className="h-3.5 w-3.5" />}
            label="Color vértice (piedra)"
            checked={s.vertexColors}
            onCheckedChange={s.setVertexColors}
          />
          <ToggleRow
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Panorama de fondo"
            checked={s.showBackdrop}
            onCheckedChange={s.setShowBackdrop}
          />
          <ToggleRow
            icon={<RotateCw className="h-3.5 w-3.5" />}
            label="Auto-orbita"
            checked={s.autoRotate}
            onCheckedChange={s.setAutoRotate}
          />
        </div>

        <Separator />

        {/* Roughness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Aspereza
            </Label>
            <span className="text-xs tabular-nums text-stone-600 dark:text-stone-300">
              {s.roughnessOverride === null ? 'auto · 0.86' : s.roughnessOverride.toFixed(2)}
            </span>
          </div>
          <Slider
            value={s.roughnessOverride === null ? [0.86] : [s.roughnessOverride]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) => s.setRoughness(v[0])}
            className="py-1"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-stone-500"
            onClick={() => s.setRoughness(null)}
          >
            Restaurar predeterminado
          </Button>
        </div>

        {/* Env intensity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Intensidad entorno
            </Label>
            <span className="text-xs tabular-nums text-stone-600 dark:text-stone-300">
              {s.envIntensity.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[s.envIntensity]}
            min={0}
            max={1.5}
            step={0.02}
            onValueChange={(v) => s.setEnvIntensity(v[0])}
            className="py-1"
          />
        </div>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          onClick={() => s.reset()}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restablecer
        </Button>

        <p className="flex items-center gap-1.5 text-[10px] leading-tight text-stone-400 dark:text-stone-600">
          <Sparkles className="h-3 w-3 shrink-0" />
          El activo ORIGEN_MASTER.glb es inmutable. Los ajustes sólo modifican parámetros del material en tiempo de ejecución.
        </p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
        <span className="text-stone-500 dark:text-stone-400">{icon}</span>
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
