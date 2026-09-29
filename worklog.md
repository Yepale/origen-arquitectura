# ORIGEN — Master 3D Logo Symbol · Project Worklog

## Project status (initial phase — COMPLETE & VERIFIED)

ORIGEN is an architectural-studio master 3D logo symbol viewer. The deliverable is the immutable `ORIGEN_MASTER.glb` emblem (three interlocking stone volumes — Tierra · Tiempo · Mano — merged into one watertight monolithic mesh with a clean arched negative space), presented on a spatial-reference pedestal against seasonal panoramas of the Sierra de Albarracín (Teruel, Spain).

### Tech stack
- Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui
- Three.js + @react-three/fiber + @react-three/drei
- three-bvh-csg for boolean geometry (CSG) when baking the GLB

### Completed & verified

**Phase 1 — GLB asset pipeline (`scripts/`)**
- `generate-origen-master.mjs` builds the ORIGEN master sculpture via CSG (base plinth + two leaning pillars + lintel/keystone MANO, minus an arched void). Output: `ORIGEN_MASTER.glb`, `ORIGEN_MASTER_LOD1.glb`, `ORIGEN_MASTER_LOD2.glb` (32/14/6-segment arches).
- `generate-pedestal.mjs` builds a clean stone drum `pedestal.glb` (cylindrical body + base ring + top cap + two carved grooves).
- `verify-origen-master.mjs` confirms the GLB contract: valid GLB 2.0, scene named `ORIGEN_MASTER` → group `ORIGEN_SYMBOL` (single mesh, limestone PBR + vertex colors), base on Y=0, centered XZ, scale 1, rotation 0.
- Bounding box: X ∈ [−1.10, 1.10], Y ∈ [0, 2.78], Z ∈ [−0.45, 0.45]. 2823 verts (master) / 1773 (LOD1) / 1167 (LOD2).

**Phase 2 — Runtime modules (`src/3d/`)**
- `masterSymbol.ts` — loads `ORIGEN_MASTER.glb`, finds `ORIGEN_SYMBOL` by name, measures bbox. Never splits / rebuilds.
- `pedestal.ts` — loads `pedestal.glb` as a spatial reference.
- `sceneManager.tsx` — procedural lighting + in-scene PBR environment (light cards, no HDRI fetch) + season-based fog.
- `cameraRig.tsx` — declarative PerspectiveCamera + OrbitControls auto-framing (no camera mutation → lint-clean).
- `interaction.ts` — hover/click lift without geometry mutation.
- `materialViewer.ts` — Zustand store for wireframe / roughness / vertex colors / env intensity / LOD / season / auto-rotate.

**Phase 3 — Frontend (`src/app/page.tsx` + `src/components/origen/`)**
- `OrigenViewer.tsx` (R3F Canvas, transparent, ACES tone mapping).
- `OrigenComposition.tsx` (assembles pedestal + symbol; symbol rests on pedestal top).
- `ControlPanel.tsx` (material inspector panel — shadcn/ui).
- `page.tsx` — seasonal panoramic backdrop (summer/winter, orientation-aware via `portrait:`/`landscape:` variants), header with Tierra/Tiempo/Mano concept tags, floating control panel (bottom-sheet on mobile, right-side on desktop) + info card, sticky footer with season toggle.
- Layout metadata updated to ORIGEN branding.

**Phase 4 — Verification (agent-browser end-to-end)**
- Page renders at `/` with 200 status; no runtime errors (only two harmless three.js deprecation warnings: `THREE.Clock` → Timer, `PCFSoftShadowMap` removed → falls back to PCFShadowMap).
- 3D monolithic arch sculpture renders on cylindrical pedestal, against the Sierra de Albarracín golden-hour panorama (summer).
- Season toggle (footer + control panel): **Verano → Invierno** swaps the backdrop to a snowy winter scene and shifts lighting to cool tones; the active button highlights correctly.
- Wireframe toggle: ON renders the symbol as a wireframe; OFF returns to solid limestone PBR. ✓
- LOD switch: Master / LOD 1 / LOD 2 all load and keep the silhouette intact (LOD 2 confirmed checked, 1.2k verts). ✓
- Panel open/close (Sparkles floating button + X close): works on both desktop and mobile. ✓
- Mobile (390×844): sculpture clearly visible, floating Sparkles button to open the bottom-sheet panel, sticky footer with season toggles at the bottom. ✓
- Sticky footer: at the bottom of the viewport; root uses `min-h-screen flex flex-col`, main is `flex-1`, footer is the last flex child. ✓
- Preview PNG generated from the live viewer → `public/assets/models/ORIGEN_MASTER_preview.png` (clean model-on-pedestal shot against the summer panorama, UI panels hidden).

### Contract compliance
- GLB is the single immutable source of truth; runtime only finds `ORIGEN_SYMBOL`, measures bbox, and places it on the pedestal.
- No splitting into Tierra/Tiempo/Mano at runtime; no procedural fallback.
- Pedestal is a separate reference, never merged into the symbol.
- Only material parameters (wireframe/roughness/vertex-colors/env-intensity) and LOD URL are tweaked at runtime.
- Pivot at world origin; base at Y=0; scale 1; rotation 0,0,0 — verified by `verify-origen-master.mjs`.

### Final assets (`public/assets/models/`)
- `ORIGEN_MASTER.glb` (114 KB) — primary production asset
- `ORIGEN_MASTER_LOD1.glb` (72 KB)
- `ORIGEN_MASTER_LOD2.glb` (48 KB)
- `ORIGEN_MASTER_preview.png` (1.8 MB) — live-viewer reference render
- `pedestal.glb` (363 KB) — spatial reference

### Next phase recommendations (for the 15-min webDevReview cadence)
- Optimize `ORIGEN_MASTER_preview.png` size with sharp (currently 1.8 MB).
- Add a "Reset view" camera action + a full-screen capture button.
- Add subtle entrance animation (monolith rises / fades in on load).
- Add a keyboard shortcut help overlay.
- Consider environment intensity auto-tuning per season for balanced exposure.
- Optionally add a contact-shadow blob under the pedestal for stronger grounding on bright winter days.
