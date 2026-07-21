/**
 * Interactive glow — the world acknowledging the visitor's presence.
 *
 * Pure functions the scene uses to make landmarks, particles, and hidden
 * discoveries brighten as the ship draws near, and to give living light a
 * gentle, organic pulse. Kept out of components so the behaviour is
 * deterministic and testable; the scene only reads these values per frame.
 */

/** Clamp x into [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Hermite smoothstep, 0 at edge0, 1 at edge1. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * How strongly a landmark should acknowledge the ship, 0..1.
 *
 * At or beyond `far` the place keeps its resting glow (0); within `near`
 * it is fully lit (1); between, it rises smoothly. Distances are plain
 * world units — pass `Math.hypot(dx, dz)`.
 */
export function proximityGlow(dist: number, near: number, far: number): number {
  if (far <= near) return dist <= near ? 1 : 0;
  return 1 - smoothstep(near, far, dist);
}

/**
 * A resting value lifted toward full by proximity: `rest` when far,
 * `rest + (peak - rest) * glow` as the ship approaches. Used to keep a
 * landmark faintly alive on the horizon yet inviting up close.
 */
export function approachLevel(
  glow: number,
  rest: number,
  peak: number,
): number {
  return rest + (peak - rest) * clamp(glow, 0, 1);
}

/**
 * A slow organic flicker in [1 - amount, 1 + amount], summing two
 * incommensurate sines so it never reads as a loop. `speed` scales the
 * base rate; `seed` offsets the phase so many emitters breathe out of sync.
 */
export function breathe(
  time: number,
  amount = 0.12,
  speed = 1,
  seed = 0,
): number {
  const a = Math.sin(time * 1.7 * speed + seed);
  const b = Math.sin(time * 2.63 * speed + seed * 1.7);
  return 1 + (a * 0.6 + b * 0.4) * amount;
}

/**
 * Candle/torch flicker: faster, sharper than {@link breathe}, biased so
 * the flame mostly burns bright and only occasionally gutters. Returns a
 * multiplier around 1.
 */
export function flameFlicker(time: number, amount = 0.18, seed = 0): number {
  const fast = Math.sin(time * 11.3 + seed) * 0.5;
  const faster = Math.sin(time * 27.1 + seed * 2.1) * 0.3;
  const roll = Math.sin(time * 3.1 + seed * 0.7) * 0.2;
  return 1 + (fast + faster + roll) * amount;
}
