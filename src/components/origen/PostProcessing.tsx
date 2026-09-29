'use client';
/**
 * PostProcessing.tsx — cinematic postprocessing stack.
 *
 *   • Bloom — soft highlight lift on the sun-lit stone edges (subtle).
 *   • Vignette — gentle darkening at the frame edges to seat the monolith.
 *   • ChromaticAberration — barely-there lens fringing for a photographic feel.
 *
 * Enabled by the `postprocessing` store flag (O key). The stack is mounted
 * conditionally; toggling is instant. Effect parameters are tuned for a
 * restrained, architectural look (not a game-y bloom blowout).
 */
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useMaterialStore } from '@/3d/materialViewer';

export function PostProcessing() {
  const enabled = useMaterialStore((s) => s.postprocessing);
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        intensity={0.42}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.7}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.0006, 0.0006)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        eskil={false}
        offset={0.28}
        darkness={0.62}
      />
    </EffectComposer>
  );
}
