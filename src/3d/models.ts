/**
 * models.ts — model library registry.
 *
 * Each entry is a complete model asset that the viewer can load. The runtime
 * treats every model with the same contract:
 *   load GLB → resolve the root (named group OR whole scene) → measure bbox
 *   → center on XZ → rest base on Y=0 → place on the pedestal → render.
 *
 * Only the ORIGEN master symbol has LODs; other models expose a single LOD.
 * The viewer's LOD selector adapts (disabled / single option for non-ORIGEN).
 */
import type { LOD } from './masterSymbol';

export type ModelId = 'origen' | 'rockyY';

export interface ModelEntry {
  id: ModelId;
  name: string;
  description: string;
  /** Primary GLB URL (the master LOD for ORIGEN, the only LOD otherwise). */
  url: string;
  /** LOD URLs (empty for non-ORIGEN models). */
  lods: Partial<Record<LOD, string>>;
  /** Whether this model has multiple LODs. */
  hasLODs: boolean;
  /** Optional named group to resolve inside the scene (ORIGEN uses this;
   *  other models fall back to the whole scene root). */
  rootName?: string;
  /** Whether the model's geometry is already centered on XZ + base on Y=0. */
  preCentered: boolean;
}

export const MODEL_LIBRARY: Record<ModelId, ModelEntry> = {
  origen: {
    id: 'origen',
    name: 'ORIGEN — Símbolo maestro',
    description: 'Emblema monolítico de piedra caliza: Tierra · Tiempo · Mano.',
    url: '/assets/models/ORIGEN_MASTER.glb',
    lods: {
      master: '/assets/models/ORIGEN_MASTER.glb',
      lod1: '/assets/models/ORIGEN_MASTER_LOD1.glb',
      lod2: '/assets/models/ORIGEN_MASTER_LOD2.glb',
    },
    hasLODs: true,
    rootName: 'ORIGEN_SYMBOL',
    preCentered: true,
  },
  rockyY: {
    id: 'rockyY',
    name: 'Letra Y rocosa',
    description: 'Modelo decorativo: letra Y esculpida en roca.',
    url: '/assets/models/rocky-Y.glb',
    lods: {},
    hasLODs: false,
    rootName: undefined, // load whole scene
    preCentered: true,    // base already at Y=0, centered on XZ
  },
};

export const MODEL_IDS: ModelId[] = ['origen', 'rockyY'];

/** Resolve the GLB URL for a given model + LOD. Non-ORIGEN models always use
 *  their single `url` regardless of the LOD selector. */
export function modelUrl(id: ModelId, lod: LOD): string {
  const entry = MODEL_LIBRARY[id];
  if (entry.hasLODs && entry.lods[lod]) return entry.lods[lod]!;
  return entry.url;
}
