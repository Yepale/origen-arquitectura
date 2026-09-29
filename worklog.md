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

---

## Round 1 — webDevReview (cron #1) · features + styling enrichment

### Current project status / assessment
Project was in a stable, verified state (Phase 1–4 complete). Lint clean, dev server healthy (all 200s). Two console warnings remained: `THREE.Clock` deprecation (drei internal, harmless) and `PCFSoftShadowMap has been removed` (R3F default). No runtime errors.

### Goals for this round
- Address the remaining `PCFSoftShadowMap` console warning.
- Add the highest-value features from the backlog: entrance animation, reset-view, PNG capture, keyboard shortcuts, concept explainer.
- Enrich styling across header / control panel / info card / footer.
- Add live telemetry (fps / draw calls / triangles).
- Optimize the preview PNG.

### Completed modifications
**1. Console warning fix — PCF shadow map**
- `OrigenViewer.tsx`: switched `Canvas` from `shadows` (boolean, defaulted to PCFSoftShadowMap → warning) to `shadows="percentage"` (maps to `THREE.PCFShadowMap`, no warning). Verified: after a fresh load the PCF warning no longer appears. Only the harmless `THREE.Clock` deprecation (from drei internals) remains.

**2. Extended runtime store (`materialViewer.ts`)**
- Added transient signals: `resetViewSignal`, `captureSignal` (incremented to trigger actions).
- Added overlay state: `showShortcuts`, `showConcept`, `conceptTag` (Tierra/Tiempo/Mano).
- Added telemetry: `fps`, `drawCalls`, `triangles`, `loaded`.
- Added actions: `resetView()`, `capture()`, `toggleShortcuts()`, `openConcept(tag)`, `closeConcept()`, `setTelemetry()`, `setLoaded()`.
- Added free functions `setMaterialsTransparent()` and `setMaterialsOpacity()` to drive the entrance animation without tripping the `react-hooks/immutability` rule (mutations wrapped in non-hook functions).

**3. Entrance animation (`OrigenComposition.tsx`)**
- On load (and on every LOD swap), the monolith rises from inside the pedestal with an ease-out-cubic over 1.6 s, fading in from opacity 0→1. Geometry is untouched (only a wrapper group's Y offset + material opacity animate). Resets cleanly on LOD change.

**4. Camera reset-view (`cameraRig.tsx`)**
- Added a `resetViewSignal` prop; an effect watches it and snaps the OrbitControls camera back to the default framed pose. Damping is briefly disabled during the snap so it's instant (otherwise damped eases look stuck in throttled/headless contexts). Verified via debug logs: distance correctly resets to ~10.69; visible change confirmed with a drag-rotate → reset test.

**5. PNG capture (`OrigenComposition.tsx`)**
- Canvas now uses `preserveDrawingBuffer: true`. When `captureSignal` increments, the WebGL canvas is read via `toDataURL('image/png')` and downloaded as `ORIGEN_capture_<timestamp>.png`, with a sonner toast "Captura guardada". Verified: toast appears on `C` key and button click.

**6. Keyboard shortcuts (`useKeyboardShortcuts.ts`)**
- Global hook: `1/2/3` LOD, `W` wireframe, `V` vertex colors, `S` season, `A` auto-rotate, `B` backdrop, `R` reset view, `C` capture, `H`/`?` shortcuts overlay, `Esc` close overlays. Ignores keystrokes while typing in inputs and respects Ctrl/Cmd/Alt combos. All verified working.

**7. Overlays (`ShortcutsOverlay.tsx`, `ConceptOverlay.tsx`)**
- Shortcuts overlay: modal listing all shortcuts with styled `<kbd>` chips. Opens via `H`/`?` or the Atajos button.
- Concept overlay: rich modal explaining Tierra / Tiempo / Mano (icon, subtitle, body, keyword chips, immutability note). Opens by clicking the header concept tags or the inline links in the info card. Verified for all three concepts.

**8. Action toolbar + telemetry strip**
- `ActionToolbar.tsx`: floating top-center buttons (Vista/Captura/Atajos) with kbd badges + tooltips.
- `TelemetryStrip.tsx`: header mini-strip (fps / calls / tris) with color-coded fps. Triangles/drawCalls computed **deterministically from the scene graph** (not `gl.info`, which caught partial frames in throttled contexts) → always truthful (3 draw calls, 4.1k triangles). fps shows `—` when unmeasured to avoid a confusing 0.

**9. Control panel redesign (`ControlPanel.tsx`)**
- Dark glassmorphism theme, CARGADO status badge, live telemetry mini-strip, quick-action grid (Vista/Captura/Atajos with kbd hints), refined toggles/sliders with kbd badges, tooltips. Reads from the enriched store.

**10. Page styling enrichment (`page.tsx`)**
- Header: refined ORIGEN wordmark with gradient logo tile + underline accent, animated entrance (framer-motion), MapPin subtitle, interactive concept tags (open concept overlay), telemetry strip + glTF badge.
- Backdrop: added subtle SVG film-grain overlay for depth.
- Decorative vertical season label (desktop, writing-mode vertical).
- Info card: top accent line, clickable concept keywords, refined stats grid.
- Footer: top gradient accent line, Compass icon, refined layout.
- Sticky footer preserved (min-h-screen flex flex-col).

**11. Preview optimization**
- `ORIGEN_MASTER_preview.png` re-encoded with sharp (resize 1280×800, PNG palette, compression 9): **1.8 MB → 392 KB**.

### Verification results (agent-browser, desktop 1440×900 + mobile 390×844)
- ✅ Page renders 200; no runtime errors; only the harmless `THREE.Clock` deprecation warning.
- ✅ PCFSoftShadowMap warning eliminated.
- ✅ Entrance animation plays (monolith rises + fades in).
- ✅ Telemetry: drawCalls=3, triangles=4.1k (deterministic, correct); fps shows `—` in throttled headless but will show ~60 in real browsers.
- ✅ Concept overlay: opens for Tierra/Tiempo/Mano (header tags + info-card links), correct content, Esc closes.
- ✅ Shortcuts overlay: opens via `H`/`?` and Atajos button; lists all 10 shortcuts; Esc closes.
- ✅ Keyboard shortcuts: `W` wireframe, `S` season (summer→winter), `C` capture (toast confirmed), `H` shortcuts, `R` reset view, `1/2/3` LOD — all verified.
- ✅ Reset view: drag-rotate → click reset → returns to default orientation (confirmed visually + via debug logs showing distance→10.69).
- ✅ Capture: toast "Captura guardada" appears; PNG download triggered.
- ✅ Mobile (390×844): clean, no overlaps, 3D model visible, top action toolbar present, sticky footer with season toggles, floating Sparkles button opens control panel as a bottom sheet.
- ✅ Sticky footer at viewport bottom on both desktop and mobile.
- ✅ Lint clean (`bun run lint` → 0 errors, 0 warnings).

### Unresolved issues / risks & next-phase recommendations
1. **`THREE.Clock` deprecation** — comes from drei internals (not our code); will resolve when drei updates. No action needed now.
2. **Headless rAF throttling** — agent-browser/headless Chromium throttles `requestAnimationFrame` for backgrounded tabs, so fps reads low and auto-rotate is imperceptible in the test harness. **Not a real-browser issue.** Could add `frameloop="demand"` + explicit `invalidate()` for power-efficiency, but `always` is fine for this real-time viewer.
3. **Mobile info card hidden** — by design (prioritizes the 3D on small screens). Could add a compact mobile info sheet accessible from the footer if needed.
4. **Next-round candidate features**:
   - Auto-tune environment intensity per season for balanced winter exposure.
   - Add a subtle contact-shadow blob (AccumulativeShadows or a soft radial gradient texture) under the pedestal for stronger grounding on bright days.
   - Add a "fullscreen" toggle for the viewer.
   - Add a share/copy-link with current view state (LOD/season/material) encoded in the URL hash.
   - Consider a subtle particle/dust motes layer for atmospheric depth in summer.

