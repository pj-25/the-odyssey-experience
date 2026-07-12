/**
 * Constellation navigation. Each undiscovered place has a constellation;
 * when the visitor consults the stars, the one pointing to the nearest
 * secret brightens on the sky dome along the bearing to sail.
 *
 * Azimuth convention matches ship heading: 0 = -Z, positive clockwise
 * from above. Elevation is radians above the horizon.
 */

export interface Constellation {
  id: string;
  poiId: string;
  name: string;
  /** What the Navigator says of it */
  lore: string;
  /** Star pattern: [azimuthOffset, elevationOffset] in radians */
  stars: Array<[number, number]>;
  /** Line segments as index pairs into `stars` */
  lines: Array<[number, number]>;
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: "gates",
    poiId: "cliffs",
    name: "The Gates",
    lore: "Two pillars that never touch. Sailors steer the darkness between them.",
    stars: [
      [-0.05, 0.1], [-0.055, 0.05], [-0.05, 0.0],
      [0.05, 0.1], [0.055, 0.05], [0.05, 0.0],
    ],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5]],
  },
  {
    id: "watcher",
    poiId: "temple",
    name: "The Watcher",
    lore: "A seated king who closed his eyes before the flood, and dreams of being woken.",
    stars: [
      [0.0, 0.12], [-0.03, 0.08], [0.03, 0.08],
      [-0.04, 0.02], [0.04, 0.02], [0.0, 0.05],
    ],
    lines: [[0, 1], [0, 2], [1, 5], [2, 5], [5, 3], [5, 4]],
  },
  {
    id: "lantern",
    poiId: "cave",
    name: "The Lantern",
    lore: "A diamond of four lights with a falling spark — the shape the sea copied for its own sky.",
    stars: [
      [0.0, 0.13], [-0.045, 0.08], [0.045, 0.08], [0.0, 0.03], [0.02, -0.01],
    ],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
  },
  {
    id: "flame",
    poiId: "beacon",
    name: "The Flame",
    lore: "A fire drawn in stars, waiting for someone to answer it from below.",
    stars: [
      [0.0, 0.14], [-0.035, 0.06], [0.035, 0.06], [0.0, 0.01], [0.0, 0.08],
    ],
    lines: [[3, 1], [1, 4], [4, 2], [2, 3], [4, 0]],
  },
  {
    id: "amphora",
    poiId: "diveSite",
    name: "The Amphora",
    lore: "A vessel poured out among the stars. What it held sank long ago — and still glows.",
    stars: [
      [-0.03, 0.12], [0.03, 0.12], [-0.04, 0.06], [0.04, 0.06],
      [-0.02, 0.0], [0.02, 0.0],
    ],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]],
  },
  {
    id: "crown",
    poiId: "hiddenCity",
    name: "The Crown",
    lore: "Five points above an empty stretch of sea. Charts call it a mistake. The fragments say otherwise.",
    stars: [
      [-0.06, 0.05], [-0.03, 0.1], [0.0, 0.13], [0.03, 0.1], [0.06, 0.05],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
];

export function constellationForPoi(poiId: string): Constellation | undefined {
  return CONSTELLATIONS.find((c) => c.poiId === poiId);
}

/** Place a pattern point on the sky dome at a base azimuth. */
export function starPosition(
  azimuth: number,
  elevation: number,
  radius: number,
): [number, number, number] {
  const y = Math.sin(elevation) * radius;
  const r = Math.cos(elevation) * radius;
  return [Math.sin(azimuth) * r, y, -Math.cos(azimuth) * r];
}

export const CONSTELLATION_ELEVATION = 0.42; // base height above horizon

/**
 * World positions for a constellation's stars, centred on the bearing
 * toward its place. Returned in the same order as `stars`.
 */
export function constellationWorldStars(
  c: Constellation,
  bearing: number,
  radius = 380,
): Array<[number, number, number]> {
  return c.stars.map(([dAz, dEl]) =>
    starPosition(bearing + dAz * 3.2, CONSTELLATION_ELEVATION + dEl * 2.6, radius),
  );
}
