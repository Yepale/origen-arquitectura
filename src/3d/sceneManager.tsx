/**
 * sceneManager.ts
 *
 * Manages the Three.js scene environment: lighting, ambient, environment
 * light cards (for PBR reflections), atmospheric fog, and season-based
 * mood. All procedural (no external HDRI downloads) for offline robustness.
 *
 * Seasons: 'summer' (warm, golden, Sierra de Albarracín limestone haze)
 *          'winter' (cool, pale, snow-soft low-contrast light)
 */
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';

export type Season = 'summer' | 'winter';

export interface SceneConfig {
  season: Season;
  /** Show the panoramic photo as a soft backdrop sphere. */
  backdropUrl?: string;
  /** Intensity multiplier for direct sun. */
  sunIntensity?: number;
}

const SEASON_PRESETS: Record<Season, {
  sky: string; ground: string; sun: string; sunAzimuth: number; sunElevation: number;
  ambient: number; fog: string; fogNear: number; fogFar: number; envIntensity: number;
}> = {
  summer: {
    sky: '#E8D9B8', ground: '#9C8B6B', sun: '#FFF1D6',
    sunAzimuth: 135, sunElevation: 62,
    ambient: 0.55, fog: '#D9C8A4', fogNear: 14, fogFar: 36, envIntensity: 0.85,
  },
  winter: {
    sky: '#DDE3EA', ground: '#B7BDC4', sun: '#EAF1F7',
    sunAzimuth: 150, sunElevation: 28,
    ambient: 0.78, fog: '#D6DCE2', fogNear: 10, fogFar: 30, envIntensity: 0.7,
  },
};

/** Polar → cartesian direction for a sun light. */
function sunDir(azimuthDeg: number, elevationDeg: number, r = 12) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return new THREE.Vector3(
    r * Math.cos(el) * Math.sin(az),
    r * Math.sin(el),
    r * Math.cos(el) * Math.cos(az)
  );
}

export function SceneManager({ season, backdropUrl }: SceneConfig) {
  const p = SEASON_PRESETS[season];
  const dir = sunDir(p.sunAzimuth, p.sunElevation);
  return (
    <>
      {/* Soft hemispheric fill (sky/ground bounce) */}
      <hemisphereLight args={[p.sky, p.ground, p.ambient]} />
      {/* Key directional "sun" with soft shadows */}
      <directionalLight
        position={[dir.x, dir.y, dir.z]}
        intensity={season === 'summer' ? 2.4 : 1.4}
        color={p.sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={8}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* Warm rim from opposite side */}
      <directionalLight
        position={[-dir.x * 0.6, dir.y * 0.5, -dir.z * 0.6]}
        intensity={season === 'summer' ? 0.5 : 0.35}
        color={season === 'summer' ? '#FFD9A0' : '#C4D6E8'}
      />
      {/* In-scene PBR environment built from light cards (no HDRI fetch). */}
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={[p.sky]} />
        <Lightformer
          form="rect"
          intensity={season === 'summer' ? 2.2 : 1.6}
          color={season === 'summer' ? '#FFF3DC' : '#E9EEF4'}
          position={[0, 5, -6]}
          scale={[12, 6, 1]}
          rotation={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.4}
          color={season === 'summer' ? '#FFC88A' : '#BFD2E6'}
          position={[-6, 3, 4]}
          scale={4}
        />
        <Lightformer
          form="circle"
          intensity={0.9}
          color={season === 'summer' ? '#FFE3B0' : '#DDE7F0'}
          position={[6, 2, 3]}
          scale={3}
        />
      </Environment>
      {/* Atmospheric fog tying the monolith to the panorama */}
      <fog attach="fog" args={[p.fog, p.fogNear, p.fogFar]} />
    </>
  );
}
