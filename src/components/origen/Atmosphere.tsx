'use client';
/**
 * Atmosphere.tsx — seasonal in-scene particle layer.
 *
 *   summer → warm dust motes drifting slowly upward (golden-hour haze).
 *   winter → soft snowfall drifting downward.
 *
 * Implemented as a single THREE.Points system with a procedural texture and
 * a useFrame drift. Cheap (a few hundred points), GPU-light, and blended
 * additively for summer / normally for winter so it reads correctly against
 * both backdrops. The layer sits around the composition (Y from 0 to ~6)
 * and fades out near the camera so it never obscures the monolith.
 */
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMaterialStore } from '@/3d/materialViewer';
import type { Season } from '@/3d/sceneManager';

const COUNT = 320;
const AREA = 9;          // horizontal spread (X/Z around origin)
const Y_MIN = 0.5;
const Y_MAX = 6.5;

function makeDotTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number; phase: number;
}

export function Atmosphere({ season }: { season: Season }) {
  const showBackdrop = useMaterialStore((s) => s.showBackdrop);
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const tex = useMemo(() => makeDotTexture(), []);

  // Initial particle descriptors (immutable). Runtime phase is derived from
  // a running elapsed time + each particle's initial phase, so we never
  // mutate the memoized array (react-hooks/immutability rule).
  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * AREA,
        y: Y_MIN + Math.random() * (Y_MAX - Y_MIN),
        z: (Math.random() - 0.5) * AREA,
        vx: (Math.random() - 0.5) * 0.08,
        vy: season === 'summer' ? 0.04 + Math.random() * 0.08 : -(0.05 + Math.random() * 0.12),
        vz: (Math.random() - 0.5) * 0.08,
        size: 0.04 + Math.random() * (season === 'summer' ? 0.1 : 0.06),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [season]);

  const elapsedRef = useRef(0);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);
    particles.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      sizes[i] = p.size;
      opacities[i] = season === 'summer' ? 0.45 : 0.85;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: season === 'summer' ? THREE.AdditiveBlending : THREE.NormalBlending,
      color: season === 'summer' ? new THREE.Color('#FFE6B0') : new THREE.Color('#F4F8FF'),
      opacity: 0.9,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [particles, tex, season]);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const dt = Math.min(delta, 0.05); // clamp to avoid jumps on tab refocus
    elapsedRef.current += dt;
    const t = elapsedRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // phase derived from elapsed time (no mutation of the memoized array)
      const phase = p.phase + t * 0.6;
      arr[i * 3] += (p.vx + Math.sin(phase) * 0.02) * dt * 8;
      arr[i * 3 + 1] += p.vy * dt * 8;
      arr[i * 3 + 2] += (p.vz + Math.cos(phase * 0.7) * 0.02) * dt * 8;
      // wrap around the volume
      if (arr[i * 3 + 1] > Y_MAX) arr[i * 3 + 1] = Y_MIN;
      if (arr[i * 3 + 1] < Y_MIN) arr[i * 3 + 1] = Y_MAX;
      const hw = AREA / 2;
      if (arr[i * 3] > hw) arr[i * 3] = -hw;
      if (arr[i * 3] < -hw) arr[i * 3] = hw;
      if (arr[i * 3 + 2] > hw) arr[i * 3 + 2] = -hw;
      if (arr[i * 3 + 2] < -hw) arr[i * 3 + 2] = hw;
    }
    pos.needsUpdate = true;
    // Billboard-ish: face the camera.
    pts.lookAt(camera.position);
  });

  if (!showBackdrop) return null;
  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
