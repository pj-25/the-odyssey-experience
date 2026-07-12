import { describe, it, expect } from "vitest";
import {
  templeStep,
  TEMPLE_ORDER,
  caveStep,
  caveOrder,
  CAVE_STARS,
  type GlyphId,
} from "../puzzles";

describe("temple glyphs", () => {
  it("solves when clicked in the order of things", () => {
    let progress: GlyphId[] = [];
    let solved = false;
    for (const glyph of TEMPLE_ORDER) {
      const r = templeStep(progress, glyph);
      expect(r.accepted).toBe(true);
      progress = r.progress;
      solved = r.solved;
    }
    expect(solved).toBe(true);
  });

  it("resets on a wrong glyph", () => {
    const first = templeStep([], TEMPLE_ORDER[0]);
    const wrong = templeStep(first.progress, TEMPLE_ORDER[0]); // repeat ≠ next
    expect(wrong.accepted).toBe(false);
    expect(wrong.progress).toEqual([]);
    expect(wrong.solved).toBe(false);
  });

  it("rejects starting anywhere but dawn", () => {
    expect(templeStep([], "home").accepted).toBe(false);
    expect(templeStep([], "dawn").accepted).toBe(true);
  });
});

describe("cave stars", () => {
  it("orders the lantern from crown to tail (descending altitude)", () => {
    const order = caveOrder();
    const ys = order.map((id) => CAVE_STARS.find((s) => s.id === id)!.y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
    }
  });

  it("solves when clicked as the spark falls", () => {
    let progress: number[] = [];
    let solved = false;
    for (const id of caveOrder()) {
      const r = caveStep(progress, id);
      expect(r.accepted).toBe(true);
      progress = r.progress;
      solved = r.solved;
    }
    expect(solved).toBe(true);
  });

  it("resets on the wrong star", () => {
    const wrongFirst = caveOrder()[3];
    const r = caveStep([], wrongFirst);
    expect(r.accepted).toBe(false);
    expect(r.progress).toEqual([]);
  });
});
