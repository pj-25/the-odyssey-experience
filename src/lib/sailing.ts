/**
 * Ship sailing model — pure and framerate-independent so it can be unit
 * tested and stepped from useFrame.
 *
 * Conventions:
 *  - World is the XZ plane; +Y up.
 *  - `heading` is radians; 0 faces -Z ("out to sea"), positive turns
 *    starboard (clockwise viewed from above).
 *  - Forward unit vector = (sin(heading), 0, -cos(heading)).
 *  - Wind `direction` is the bearing the wind blows TOWARD, same convention.
 */

export interface ShipState {
  x: number;
  z: number;
  heading: number;
  /** world units / second */
  speed: number;
}

export interface HelmInput {
  /** -1 = full port, +1 = full starboard */
  rudder: number;
  /** sails raised (catching wind) or furled */
  sailsUp: boolean;
}

export interface Wind {
  /** bearing wind blows toward, radians */
  direction: number;
  /** 0..1 */
  strength: number;
}

export const MAX_SPEED = 14; // units/s at full wind, dead run
export const TURN_RATE = 0.9; // rad/s at speed
const ACCEL_TAU = 2.2; // seconds to approach target speed
const DRIFT_SPEED = 0.4; // bare-poles drift

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * How efficiently a square-rigged sail draws at a given angle off the wind.
 * 1 on a dead run (wind directly astern), fading to a floor when pinched
 * against the wind — she'll always crawl, never park (kind to players).
 */
export function sailEfficiency(heading: number, wind: Wind): number {
  const off = Math.abs(wrapAngle(heading - wind.direction));
  const draw = Math.cos(off); // 1 downwind, -1 into the wind
  return Math.max(0.18, 0.18 + 0.82 * Math.max(0, draw));
}

/** Advance the ship one timestep. Returns a new state. */
export function stepShip(
  state: ShipState,
  input: HelmInput,
  wind: Wind,
  dt: number,
): ShipState {
  // Rudder authority grows with way through the water
  const authority = 0.35 + 0.65 * Math.min(1, state.speed / (MAX_SPEED * 0.5));
  const heading = wrapAngle(
    state.heading + input.rudder * TURN_RATE * authority * dt,
  );

  const target = input.sailsUp
    ? MAX_SPEED * wind.strength * sailEfficiency(heading, wind)
    : DRIFT_SPEED;

  // First-order lag toward target speed
  const blend = 1 - Math.exp(-dt / ACCEL_TAU);
  const speed = state.speed + (target - state.speed) * blend;

  return {
    x: state.x + Math.sin(heading) * speed * dt,
    z: state.z - Math.cos(heading) * speed * dt,
    heading,
    speed,
  };
}

/**
 * Wind that wanders believably: direction and strength drift on slow,
 * deterministic sine mixtures of elapsed time.
 */
export function windAt(t: number): Wind {
  const direction = wrapAngle(
    -0.6 + Math.sin(t * 0.013) * 1.1 + Math.sin(t * 0.0041 + 2.1) * 0.9,
  );
  const strength =
    0.72 + Math.sin(t * 0.021 + 1.3) * 0.16 + Math.sin(t * 0.0073) * 0.12;
  return { direction, strength: Math.min(1, Math.max(0.4, strength)) };
}

/** Bearing (heading convention above) from (x,z) toward (tx,tz). */
export function bearingTo(
  x: number,
  z: number,
  tx: number,
  tz: number,
): number {
  return Math.atan2(tx - x, -(tz - z));
}

/** Distance in the XZ plane. */
export function distance2D(
  x: number,
  z: number,
  tx: number,
  tz: number,
): number {
  return Math.hypot(tx - x, tz - z);
}

/** Compass label for a bearing, e.g. "NW". North = out to sea (-Z). */
export function compassLabel(bearing: number): string {
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(wrapAngle(bearing) / (Math.PI / 4)) & 7;
  return names[(idx + 8) % 8];
}
