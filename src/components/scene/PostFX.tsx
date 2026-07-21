"use client";

import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Cinematic light bloom — the atmosphere's crowning pass.
 *
 * Bright, genuinely emissive things (the moon, the watchfire, cave
 * crystals, the golden city, the aurora, the ship's lantern) bleed a soft
 * halo into the night, the way real light does through sea air and a lens.
 * The threshold is deliberately high so tone-mapped water and rock never
 * bloom — the effect stays elegant, not neon, per the world's aesthetic.
 *
 * Mounted only on the high quality tier. The composer disables the
 * renderer's own tone mapping while active, so ACES is re-applied here as
 * the final effect to preserve the graded look; the low tier keeps the
 * untouched renderer path and its own tone mapping.
 */
export default function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.72}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.3}
        radius={0.62}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
