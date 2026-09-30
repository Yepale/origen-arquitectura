'use client';
/**
 * OrigenComposition.tsx — the assembled 3D scene contents.
 *
 * FINAL PHASE:
 *   - NO pedestal. The ORIGEN symbol stands autonomously on Y=0.
 *   - The three named parts (TIERRA / TIEMPO / MANO) are driven by the
 *     AssemblyAnimation: they appear offset, slide to their final positions,
 *     and settle into the complete ORIGEN emblem.
 *   - A subtle radial ground shadow grounds the symbol (NOT a pedestal —
 *     just a soft contact shadow on the ground plane).
 *   - Material sync applies the selected material preset to all parts.
 *   - Telemetry + capture are preserved from prior rounds.
 *
 * Runtime contract: load GLB → resolve ORIGEN_SYMBOL → find TIERRA/TIEMPO/MANO
 *   → never split/rebuild geometry → the animation only offsets transforms
 *   temporarily; the final state = identity transforms = the original GLB.
 */
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useOrigenSymbol } from '@/3d/masterSymbol';
import { applyHoverState, useInteraction } from '@/3d/interaction';
import {
  syncMaterialState,
  setMaterialsTransparent,
  useMaterialStore,
} from '@/3d/materialViewer';
import { AssemblyAnimation, initPartMaterials } from '@/3d/assemblyAnimation';
import { EdgesOverlay } from './EdgesOverlay';

export interface CompositionInfo {
  symbolHeight: number;
  compositionHeight: number;
  compositionWidth: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function makeSoftShadowTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.7)');
  g.addColorStop(0.4, 'rgba(0,0,0,0.4)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function OrigenComposition({
  onLoaded,
}: {
  onLoaded?: (info: CompositionInfo) => void;
}) {
  const lod = useMaterialStore((s) => s.lod);
  const wireframe = useMaterialStore((s) => s.wireframe);
  const roughnessOverride = useMaterialStore((s) => s.roughnessOverride);
  const vertexColors = useMaterialStore((s) => s.vertexColors);
  const envIntensity = useMaterialStore((s) => s.envIntensity);
  const materialPreset = useMaterialStore((s) => s.materialPreset);
  const captureSignal = useMaterialStore((s) => s.captureSignal);
  const setTelemetry = useMaterialStore((s) => s.setTelemetry);
  const setLoaded = useMaterialStore((s) => s.setLoaded);
  const season = useMaterialStore((s) => s.season);
  const modelId = useMaterialStore((s) => s.modelId);

  const { root, size, meshes, parts } = useOrigenSymbol(modelId, lod);
  const inter = useInteraction();
  const { gl } = useThree();
  const assembledRef = useRef(false);

  // Make materials transparent so the assembly fade-in works.
  useEffect(() => {
    initPartMaterials(meshes);
    assembledRef.current = false;
  }, [meshes]);

  // Report composition dimensions + mark loaded.
  useEffect(() => {
    onLoaded?.({
      symbolHeight: size.y,
      compositionHeight: size.y,
      compositionWidth: size.x,
    });
    setLoaded(true);
  }, [size.y, size.x, onLoaded, setLoaded]);

  // Telemetry (deterministic scene-graph stats).
  const sceneStats = useMemo(() => {
    let triangles = 0;
    let drawCalls = 0;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      const geo = mesh.geometry;
      if (!geo) return;
      drawCalls += 1;
      const pos = geo.getAttribute('position');
      const idx = geo.getIndex();
      const meshTris = idx ? Math.floor(idx.count / 3) : (pos ? Math.floor(pos.count / 3) : 0);
      triangles += meshTris;
    });
    return { triangles, drawCalls };
  }, [root]);

  // Telemetry sample (fps + drawCalls + triangles) ~4x/sec.
  const telAccum = useRef(0);
  const fpsAccum = useRef({ frames: 0, t: 0 });

  useFrame((_, delta) => {
    // Material sync (wireframe / roughness / vertex colors / env / preset).
    applyHoverState(meshes, inter.hovered);
    syncMaterialState(meshes, {
      wireframe,
      roughnessOverride,
      vertexColors,
      envIntensity,
      materialPreset,
      // remaining fields unused by syncMaterialState:
      showEdges: false, lod, season, autoRotate: true, showBackdrop: true,
      audioEnabled: false, autoTour: false, guidedTour: false, compareView: false,
      galleryMode: false, postprocessing: false, kiosk: false, modelId,
      bookmarks: [], showBookmarks: false, applyOrbitSignal: 0, pendingOrbit: null,
      resetViewSignal: 0, captureSignal: 0, cameraPresetSignal: 0, cameraPreset: 'hero',
      shareSignal: 0, showShortcuts: false, showConcept: false, conceptTag: null,
      showMobileInfo: false, fullscreen: false, fps: 0, drawCalls: 0, triangles: 0,
      loaded: false,
      setWireframe: () => {}, setShowEdges: () => {}, setRoughness: () => {},
      setVertexColors: () => {}, setEnvIntensity: () => {}, setLod: () => {},
      setSeason: () => {}, setAutoRotate: () => {}, setShowBackdrop: () => {},
      setAudioEnabled: () => {}, setAutoTour: () => {}, setGuidedTour: () => {},
      setCompareView: () => {}, setGalleryMode: () => {}, setPostprocessing: () => {},
      setMaterialPreset: () => {}, setKiosk: () => {}, setModelId: () => {},
      saveBookmark: () => {}, deleteBookmark: () => {}, applyBookmark: () => {},
      toggleBookmarks: () => {}, applyOrbit: () => {}, resetView: () => {},
      capture: () => {}, applyCameraPreset: () => {}, share: () => {},
      toggleShortcuts: () => {}, openConcept: () => {}, closeConcept: () => {},
      toggleMobileInfo: () => {}, setFullscreen: () => {}, setTelemetry: () => {},
      setLoaded: () => {}, reset: () => {},
    } as any);

    // Telemetry sample.
    fpsAccum.current.frames += 1;
    fpsAccum.current.t += delta;
    telAccum.current += delta;
    if (telAccum.current >= 0.25) {
      const fps = fpsAccum.current.t > 0 ? fpsAccum.current.frames / fpsAccum.current.t : 0;
      setTelemetry({
        fps: Math.round(fps),
        drawCalls: sceneStats.drawCalls,
        triangles: sceneStats.triangles,
      });
      telAccum.current = 0;
      fpsAccum.current = { frames: 0, t: 0 };
    }
  });

  // Capture signal → download PNG.
  useEffect(() => {
    if (captureSignal === 0) return;
    const url = gl.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORIGEN_capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Captura guardada', {
      description: 'Imagen PNG descargada del símbolo ORIGEN.',
    });
  }, [captureSignal, gl]);

  return (
    <group>
      {/* Soft radial ground shadow — NOT a pedestal, just a contact shadow
          that grounds the symbol on the ground plane. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[1.6, 64]} />
        <meshBasicMaterial
          map={useMemo(() => makeSoftShadowTexture(), [])}
          transparent
          opacity={0.6}
          depthWrite={false}
          color={season === 'summer' ? '#3a2a14' : '#2a3340'}
        />
      </mesh>
      {/* Real-time directional shadow catcher (subtle, on the ground) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.4, 64]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      {/* ORIGEN master symbol — three parts animated by AssemblyAnimation.
          The root group is at Y=0 (base on the ground). Each part's local
          transform is animated by AssemblyAnimation; the final state =
          identity transforms = the original GLB. */}
      <group
        onPointerOver={inter.onPointerOver}
        onPointerOut={inter.onPointerOut}
        onClick={inter.onClick}
      >
        <primitive object={root} castShadow receiveShadow />
      </group>
      {/* Technical-inspection edges overlay (purely additive). */}
      <EdgesOverlay meshes={meshes} pedestalMeshes={[]} symbolWorldY={0} />
      {/* The assembly animation drives the three parts. */}
      <AssemblyAnimation
        parts={parts}
        meshes={meshes}
        materialPreset={materialPreset}
      />
    </group>
  );
}
