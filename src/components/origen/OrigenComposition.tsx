'use client';
/**
 * OrigenComposition.tsx — the assembled 3D scene contents.
 *
 * Runtime flow (per ORIGEN production contract):
 *   ORIGEN_MASTER.glb → ORIGEN_SYMBOL (found by name) → measure bbox
 *   → pedestal as spatial reference → place symbol on pedestal top → render.
 *
 * The ORIGEN mesh is NEVER split, repositioned internally, or procedurally
 * rebuilt. Only material parameters (wireframe / roughness / vertex colors /
 * env intensity) are synced for inspection, and the LOD GLB URL may be
 * swapped for performance.
 *
 * Adds:
 *   - Entrance animation: the monolith rises from inside the pedestal and
 *     fades in (opacity 0→1, y offset eased) on first load. Achieved by
 *     animating a wrapper group's transform + mesh material opacity —
 *     geometry is untouched.
 *   - Capture signal: when `captureSignal` increments, grab the WebGL canvas
 *     and emit a download + toast.
 *   - Telemetry: reports fps / drawCalls / triangles to the store.
 */
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useOrigenSymbol } from '@/3d/masterSymbol';
import { usePedestal } from '@/3d/pedestal';
import { applyHoverState, useInteraction } from '@/3d/interaction';
import { syncMaterialState, setMaterialsTransparent, setMaterialsOpacity, useMaterialStore } from '@/3d/materialViewer';

export interface CompositionInfo {
  symbolHeight: number;
  compositionHeight: number;
  compositionWidth: number;
  pedestalTopY: number;
}

// Entrance animation easing.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
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
  const captureSignal = useMaterialStore((s) => s.captureSignal);
  const setTelemetry = useMaterialStore((s) => s.setTelemetry);
  const setLoaded = useMaterialStore((s) => s.setLoaded);
  const resetViewSignal = useMaterialStore((s) => s.resetViewSignal);

  const { symbol, size, meshes } = useOrigenSymbol(lod);
  const { pedestal, topY } = usePedestal();
  const inter = useInteraction();
  const { gl } = useThree();

  // Deterministic scene-graph stats (computed once per LOD swap). These are
  // stable regardless of frame-loop throttling, so telemetry is always
  // truthful even in backgrounded/throttled contexts.
  const sceneStats = useMemo(() => {
    let triangles = 0;
    let drawCalls = 0;
    const collect = (obj: THREE.Object3D) => {
      obj.traverse((o) => {
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
    };
    collect(symbol);
    collect(pedestal);
    // +1 draw call for the contact shadow plane (inline mesh).
    drawCalls += 1;
    return { triangles, drawCalls };
  }, [symbol, pedestal]);

  // Wrapper group for the entrance animation (y-offset + opacity).
  const symbolGroupRef = useRef<THREE.Group>(null);
  const animStartRef = useRef<number | null>(null);

  // Place pedestal at origin (base already on Y=0), symbol on top.
  const symbolWorldY = topY;

  // Make materials transparent so we can fade them in.
  useEffect(() => {
    setMaterialsTransparent(meshes, true);
  }, [meshes]);

  // Reset the entrance animation whenever the LOD changes.
  useEffect(() => {
    animStartRef.current = null;
    if (symbolGroupRef.current) {
      symbolGroupRef.current.position.y = -0.9;
    }
    setMaterialsOpacity(meshes, 0);
  }, [lod, meshes]);

  // Report composition dimensions + mark loaded.
  useEffect(() => {
    onLoaded?.({
      symbolHeight: size.y,
      compositionHeight: topY + size.y,
      compositionWidth: Math.max(size.x, 2.1),
      pedestalTopY: topY,
    });
    setLoaded(true);
  }, [size.y, size.x, topY, onLoaded, setLoaded]);

  // Telemetry (fps / draw calls / triangles) — sampled ~4x/sec.
  const telAccum = useRef(0);
  const fpsAccum = useRef({ frames: 0, t: 0 });

  useFrame((_, delta) => {
    // Entrance animation (1.6s ease-out cubic).
    if (animStartRef.current === null) animStartRef.current = 0;
    animStartRef.current += delta;
    const tRaw = Math.min(animStartRef.current / 1.6, 1);
    const t = easeOutCubic(tRaw);
    if (symbolGroupRef.current) {
      symbolGroupRef.current.position.y = THREE.MathUtils.lerp(-0.9, 0, t);
    }
    setMaterialsOpacity(meshes, t);

    // Material sync (wireframe / roughness / vertex colors / env).
    applyHoverState(meshes, inter.hovered);
    syncMaterialState(meshes, {
      wireframe,
      roughnessOverride,
      vertexColors,
      envIntensity,
      // remaining fields unused by syncMaterialState:
      lod, season: 'summer', autoRotate: true, showBackdrop: true,
      setWireframe: () => {}, setRoughness: () => {}, setVertexColors: () => {},
      setEnvIntensity: () => {}, setLod: () => {}, setSeason: () => {},
      setAutoRotate: () => {}, setShowBackdrop: () => {}, reset: () => {},
    } as any);

    // Telemetry sample. Triangles/drawCalls are deterministic (scene-graph
    // sums); fps is a rolling counter of actual frames.
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

  // Capture signal → download PNG. `preserveDrawingBuffer: true` on the
  // canvas guarantees the buffer is readable; R3F renders every frame so the
  // buffer is already current by the time the user clicks capture.
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

  // (resetViewSignal is consumed by CameraRig; we read it here only to keep
  // the dependency graph honest if we later want to react in-scene.)
  void resetViewSignal;

  return (
    <group>
      {/* Soft contact shadow just under the pedestal base */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[2.4, 64]} />
        <shadowMaterial opacity={0.32} />
      </mesh>
      {/* Pedestal — spatial reference only, never merged with ORIGEN */}
      <primitive object={pedestal} position={[0, 0, 0]} castShadow receiveShadow />
      {/* ORIGEN master symbol — immutable, rests on pedestal.
          Wrapped in an animating group for the entrance reveal. */}
      <group
        position={[0, symbolWorldY, 0]}
        onPointerOver={inter.onPointerOver}
        onPointerOut={inter.onPointerOut}
        onClick={inter.onClick}
      >
        <group ref={symbolGroupRef} position={[0, -0.9, 0]}>
          <primitive object={symbol} castShadow receiveShadow />
        </group>
      </group>
    </group>
  );
}
