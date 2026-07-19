/**
 * Hull lines for the galley, as pure functions of normalized station
 * t ∈ [0,1] (0 = stern, 1 = bow). Real hulls are lofted from exactly
 * these curves: beam (width), keel (draft), and sheer (deck rise).
 * The scene builds its BufferGeometry from them; tests pin their shape.
 */

export const HULL_LENGTH = 11.2;
export const HULL_BEAM = 1.7; // half-width at midship
export const HULL_DRAFT = 1.25; // keel depth below waterline at midship
export const SHEER_MID = 0.55; // gunwale height amidships
export const SHEER_ENDS = 1.5; // gunwale rise at bow/stern

/** Half-beam at station t: full amidships, pointed at both ends. */
export function halfBeam(t: number): number {
  const u = 2 * t - 1; // -1..1
  return HULL_BEAM * Math.pow(Math.max(0, 1 - u * u), 0.62);
}

/** Keel depth (positive down) at station t: deepest amidships. */
export function keelDepth(t: number): number {
  const u = 2 * t - 1;
  return 0.12 + (HULL_DRAFT - 0.12) * Math.sqrt(Math.max(0, 1 - u * u));
}

/** Gunwale height (sheer line) at station t: sweeps up toward the ends. */
export function sheerHeight(t: number): number {
  const u = 2 * t - 1;
  return SHEER_MID + (SHEER_ENDS - SHEER_MID) * u * u * u * u;
}

/**
 * A point on the hull skin. u ∈ [0,1] runs from keel (0) to gunwale (1);
 * side is -1 (port) or +1 (starboard). Returns [x, y, z] in ship space
 * (x abeam, y up, z along the keel with stern at +L/2, matching the
 * ship model's stern-lantern convention).
 */
export function hullPoint(
  t: number,
  u: number,
  side: 1 | -1,
): [number, number, number] {
  const w = halfBeam(t);
  const keel = keelDepth(t);
  const sheer = sheerHeight(t);
  // Rounded bilge: beam blooms out on a quarter-sine, depth eases up
  const x = side * w * Math.sin((u * Math.PI) / 2);
  const y = -keel * Math.cos((u * Math.PI) / 2) + sheer * Math.pow(u, 1.6);
  const z = HULL_LENGTH / 2 - t * HULL_LENGTH;
  return [x, y, z];
}
