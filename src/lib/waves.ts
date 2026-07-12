/**
 * Ocean wave field, mirrored in GLSL (Ocean.tsx vertex shader) and in
 * TypeScript so the ship can ride the exact same water surface.
 *
 * The surface is a sum of directional sine waves. Keep the constants in
 * sync with the shader — they are the single source of truth here.
 */

export interface WaveComponent {
  /** Direction (normalized 2D) */
  dx: number;
  dz: number;
  /** Spatial frequency */
  freq: number;
  /** Amplitude at waveAmp = 1 */
  amp: number;
  /** Temporal speed */
  speed: number;
}

export const WAVE_COMPONENTS: WaveComponent[] = [
  { dx: 1.0, dz: 0.18, freq: 0.16, amp: 0.62, speed: 0.85 },
  { dx: -0.62, dz: 0.78, freq: 0.27, amp: 0.34, speed: 1.15 },
  { dx: 0.22, dz: -0.97, freq: 0.45, amp: 0.19, speed: 1.6 },
  { dx: -0.9, dz: -0.43, freq: 0.9, amp: 0.08, speed: 2.3 },
];

/** Height of the ocean surface at world (x, z), time t, amplitude scale. */
export function waveHeight(
  x: number,
  z: number,
  t: number,
  waveAmp: number,
): number {
  let y = 0;
  for (const w of WAVE_COMPONENTS) {
    const phase = (x * w.dx + z * w.dz) * w.freq + t * w.speed;
    y += Math.sin(phase) * w.amp;
  }
  return y * waveAmp;
}

/**
 * Approximate surface normal via central differences — used to pitch/roll
 * the ship with the swell.
 */
export function waveSlope(
  x: number,
  z: number,
  t: number,
  waveAmp: number,
): { dx: number; dz: number } {
  const e = 0.6;
  const hx =
    (waveHeight(x + e, z, t, waveAmp) - waveHeight(x - e, z, t, waveAmp)) /
    (2 * e);
  const hz =
    (waveHeight(x, z + e, t, waveAmp) - waveHeight(x, z - e, t, waveAmp)) /
    (2 * e);
  return { dx: hx, dz: hz };
}

/** GLSL snippet implementing the same wave sum (injected into the vertex shader). */
export const WAVE_GLSL = /* glsl */ `
  float waveHeight(vec2 p, float t, float waveAmp) {
    float y = 0.0;
    y += sin((p.x *  1.00 + p.y *  0.18) * 0.16 + t * 0.85) * 0.62;
    y += sin((p.x * -0.62 + p.y *  0.78) * 0.27 + t * 1.15) * 0.34;
    y += sin((p.x *  0.22 + p.y * -0.97) * 0.45 + t * 1.60) * 0.19;
    y += sin((p.x * -0.90 + p.y * -0.43) * 0.90 + t * 2.30) * 0.08;
    return y * waveAmp;
  }
`;
