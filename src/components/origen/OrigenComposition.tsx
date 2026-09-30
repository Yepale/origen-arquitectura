'use client';
/**
 * OrigenComposition.tsx — INTERACTIVE drag-to-assemble scene.
 *
 * The three real stone pieces (TIERRA / TIEMPO / MANO) are loaded from the
 * user's GLB as-is, wrapped in Groups at runtime, scattered, and the user
 * drags each to its recorded target position. When all three snap, ORIGEN
 * is complete → the landing is revealed.
 *
 * NO GLB regeneration. NO geometry modification. NO pedestal. NO procedural.
 * The geometry is the real GLB — only the Groups' positions are animated.
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
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.3)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.08)');
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

  const { root, size, meshes, parts, targets } = useOrigenSymbol(modelId, lod);
  const inter = useInteraction();
  const { gl } = useThree();

  useEffect(() => {
    // Report composition dimensions that account for the SCATTER offsets
    // (not just the assembled bbox) so the camera frames all 3 pieces
    // in their initial scattered positions.
    const scatterW = 1.6 * 2;   // TIERRA -1.6 + TIEMPO +1.6
    const scatterH = size.y + 1.4; // MANO +1.4 upward
    onLoaded?.({
      symbolHeight: size.y,
      compositionHeight: Math.max(size.y, scatterH),
      compositionWidth: Math.max(size.x, scatterW + size.x),
    });
    setLoaded(true);
  }, [size.y, size.x, onLoaded, setLoaded]);

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

  useEffect(() => {
    if (captureSignal === 0) return;
    const url = gl.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORIGEN_capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Captura guardada');
  }, [captureSignal, gl]);

  return (
    <group>
      {/* Soft ground shadow — a SIBLING of the pieces, NOT a child. Stays fixed. */}
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
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.0, 64]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
      {/* The three real stone pieces — rendered ONLY as individual primitives.
          NEVER render <primitive object={root}> — that would re-parent the
          pieces back into root and make them move together. Each piece is a
          standalone Group with its own position, independent of the others. */}
      {(['TIERRA', 'TIEMPO', 'MANO'] as PartName[]).map((name) => {
        const obj = parts[name];
        if (!obj) return null;
        return (
          <primitive
            key={name}
            object={obj}
            onPointerDown={(e: any) => {
              if (e.button !== undefined && e.button !== 0) return; // left button only
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('origen-drag-start', {
                detail: { name, object: e.object },
              }));
            }}
            onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          />
        );
      })}
      {/* Interactive drag-to-assemble system. */}
      <AssemblyInteraction parts={parts} targets={targets} meshes={meshes} />
      {/* Technical edges overlay. */}
      <EdgesOverlay meshes={meshes} pedestalMeshes={[]} symbolWorldY={0} />
    </group>
  );
}
