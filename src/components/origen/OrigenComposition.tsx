'use client';
/**
 * OrigenComposition.tsx — INTERACTIVE drag-to-assemble scene.
 *
 * The three real stone pieces (TIERRA / TIEMPO / MANO) are scattered around
 * the scene. The user DRAGS each piece to its target position. When all three
 * snap, ORIGEN is complete → the landing is revealed.
 *
 * NO automatic animation. NO pedestal. NO procedural geometry.
 * The geometry is the real GLB — only the groups' positions are animated.
 *
 * Runtime contract: load GLB → resolve ORIGEN_SYMBOL → find TIERRA/TIEMPO/MANO
 *   groups → scatter → user drags → snap to identity → complete.
 */
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useOrigenSymbol, type PartName } from '@/3d/masterSymbol';
import { applyHoverState, useInteraction } from '@/3d/interaction';
import { syncMaterialState, useMaterialStore } from '@/3d/materialViewer';
import { AssemblyInteraction } from '@/3d/assemblyInteraction';
import { EdgesOverlay } from './EdgesOverlay';

export interface CompositionInfo {
  symbolHeight: number;
  compositionHeight: number;
  compositionWidth: number;
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

  // Report composition dimensions + mark loaded.
  useEffect(() => {
    onLoaded?.({
      symbolHeight: size.y,
      compositionHeight: size.y,
      compositionWidth: size.x,
    });
    setLoaded(true);
  }, [size.y, size.x, onLoaded, setLoaded]);

  // Deterministic telemetry.
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
      triangles += idx ? Math.floor(idx.count / 3) : (pos ? Math.floor(pos.count / 3) : 0);
    });
    return { triangles, drawCalls };
  }, [root]);

  const telAccum = useRef(0);
  const fpsAccum = useRef({ frames: 0, t: 0 });

  useFrame((_, delta) => {
    // Material sync.
    applyHoverState(meshes, inter.hovered);
    syncMaterialState(meshes, {
      wireframe, roughnessOverride, vertexColors, envIntensity, materialPreset,
      showEdges: false, lod, season, autoRotate: true, showBackdrop: true,
      audioEnabled: false, autoTour: false, guidedTour: false, compareView: false,
      galleryMode: false, postprocessing: false, kiosk: false, modelId,
      bookmarks: [], showBookmarks: false, applyOrbitSignal: 0, pendingOrbit: null,
      resetViewSignal: 0, captureSignal: 0, cameraPresetSignal: 0, cameraPreset: 'hero',
      shareSignal: 0, showShortcuts: false, showConcept: false, conceptTag: null,
      showMobileInfo: false, fullscreen: false, fps: 0, drawCalls: 0, triangles: 0,
      loaded: false, assembled: false, assemblyPhase: 'scattered',
      setWireframe: () => {}, setShowEdges: () => {}, setRoughness: () => {},
      setVertexColors: () => {}, setEnvIntensity: () => {}, setLod: () => {},
      setSeason: () => {}, setAutoRotate: () => {}, setShowBackdrop: () => {},
      setAudioEnabled: () => {}, setAutoTour: () => {}, setGuidedTour: () => {},
      setCompareView: () => {}, setGalleryMode: () => {}, setPostprocessing: () => {},
      setMaterialPreset: () => {}, setKiosk: () => {}, setModelId: () => {},
      setAssembled: () => {}, setAssemblyPhase: () => {},
      saveBookmark: () => {}, deleteBookmark: () => {}, applyBookmark: () => {},
      toggleBookmarks: () => {}, applyOrbit: () => {}, resetView: () => {},
      capture: () => {}, applyCameraPreset: () => {}, share: () => {},
      toggleShortcuts: () => {}, openConcept: () => {}, closeConcept: () => {},
      toggleMobileInfo: () => {}, setFullscreen: () => {}, setTelemetry: () => {},
      setLoaded: () => {}, reset: () => {},
    } as any);

    // Telemetry.
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
    toast.success('Captura guardada', { description: 'Imagen PNG descargada.' });
  }, [captureSignal, gl]);

  // Pointer event handlers for each part (drag → AssemblyInteraction manages).
  const partHandlers = useMemo(() => {
    const handlers: Record<string, (e: any) => void> = {};
    for (const name of ['TIERRA', 'TIEMPO', 'MANO'] as PartName[]) {
      handlers[name] = (e: any) => {
        // The AssemblyInteraction manages the drag; here we just stop propagation
        // so OrbitControls doesn't rotate while clicking a piece.
        e.stopPropagation();
      };
    }
    return handlers;
  }, []);

  return (
    <group>
      {/* Soft ground shadow (NOT a pedestal — just a contact shadow). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[1.2, 64]} />
        <meshBasicMaterial
          map={useMemo(() => makeSoftShadowTexture(), [])}
          transparent
          opacity={0.5}
          depthWrite={false}
          color={season === 'summer' ? '#3a2a14' : '#2a3340'}
        />
      </mesh>
      {/* Directional shadow catcher. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.0, 64]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
      {/* The three real stone pieces — rendered individually so each has its
          own pointer handler for the drag interaction. AssemblyInteraction
          scatters + manages drag + snap. */}
      {(['TIERRA', 'TIEMPO', 'MANO'] as PartName[]).map((name) => {
        const obj = parts[name];
        if (!obj) return null;
        return (
          <primitive
            key={name}
            object={obj}
            onPointerDown={(e: any) => {
              e.stopPropagation();
              // Forward to AssemblyInteraction via a custom event.
              window.dispatchEvent(new CustomEvent('origen-drag-start', { detail: { name, point: e.point } }));
            }}
            onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          />
        );
      })}
      {/* Interactive drag-to-assemble system. */}
      <AssemblyInteraction parts={parts as any} meshes={meshes} />
      {/* Technical edges overlay (additive). */}
      <EdgesOverlay meshes={meshes} pedestalMeshes={[]} symbolWorldY={0} />
    </group>
  );
}
