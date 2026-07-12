/**
 * The world's two optional puzzles, as pure logic. The UI renders them;
 * these functions decide.
 */

/* ------------------------------------------------------------------ */
/* Temple glyphs: "the order of things — dawn, sea, storm, home"        */
/* ------------------------------------------------------------------ */

export type GlyphId = "dawn" | "sea" | "storm" | "home";

export const TEMPLE_ORDER: GlyphId[] = ["dawn", "sea", "storm", "home"];

export interface Glyph {
  id: GlyphId;
  name: string;
  /** Inline SVG path (24×24 viewBox) */
  path: string;
}

export const GLYPHS: Glyph[] = [
  {
    id: "storm",
    name: "Storm",
    path: "M13 2 L6 13 L11 13 L9 22 L18 9 L12.5 9 Z",
  },
  {
    id: "home",
    name: "Home",
    path: "M12 3 L21 11 L18 11 L18 21 L6 21 L6 11 L3 11 Z",
  },
  {
    id: "dawn",
    name: "Dawn",
    path: "M3 17 L21 17 L21 19 L3 19 Z M12 5 A6 6 0 0 1 18 11 L6 11 A6 6 0 0 1 12 5 Z",
  },
  {
    id: "sea",
    name: "Sea",
    path: "M2 9 Q5 6 8 9 T14 9 T20 9 L22 9 L22 12 Q19 15 16 12 T10 12 T4 12 L2 12 Z",
  },
];

/**
 * Feed a clicked glyph into the current progress. Returns the new
 * progress, whether that click was accepted, and whether the ring opened.
 */
export function templeStep(
  progress: GlyphId[],
  clicked: GlyphId,
): { progress: GlyphId[]; accepted: boolean; solved: boolean } {
  const expected = TEMPLE_ORDER[progress.length];
  if (clicked !== expected) {
    return { progress: [], accepted: false, solved: false };
  }
  const next = [...progress, clicked];
  return {
    progress: next,
    accepted: true,
    solved: next.length === TEMPLE_ORDER.length,
  };
}

/* ------------------------------------------------------------------ */
/* Cave stars: "join the lights as the spark falls" — highest first     */
/* ------------------------------------------------------------------ */

export interface CaveStar {
  id: number;
  /** Percent position inside the panel */
  x: number;
  y: number;
}

/** The Lantern, as it appears on the cavern ceiling (y up = smaller %). */
export const CAVE_STARS: CaveStar[] = [
  { id: 0, x: 50, y: 14 }, // crown
  { id: 1, x: 28, y: 38 },
  { id: 2, x: 72, y: 34 },
  { id: 3, x: 50, y: 62 }, // heart
  { id: 4, x: 60, y: 84 }, // tail
];

/** Correct order: descending altitude (ascending y). */
export function caveOrder(stars: CaveStar[] = CAVE_STARS): number[] {
  return [...stars].sort((a, b) => a.y - b.y).map((s) => s.id);
}

export function caveStep(
  progress: number[],
  clickedId: number,
  stars: CaveStar[] = CAVE_STARS,
): { progress: number[]; accepted: boolean; solved: boolean } {
  const order = caveOrder(stars);
  const expected = order[progress.length];
  if (clickedId !== expected) {
    return { progress: [], accepted: false, solved: false };
  }
  const next = [...progress, clickedId];
  return {
    progress: next,
    accepted: true,
    solved: next.length === order.length,
  };
}
