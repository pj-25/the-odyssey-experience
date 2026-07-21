import { describe, it, expect } from "vitest";
import {
  clamp,
  smoothstep,
  proximityGlow,
  approachLevel,
  breathe,
  flameFlicker,
} from "../glow";

describe("clamp", () => {
  it("bounds to the range", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe("smoothstep", () => {
  it("is 0 below, 1 above, and 0.5 at the midpoint", () => {
    expect(smoothstep(10, 20, 5)).toBe(0);
    expect(smoothstep(10, 20, 25)).toBe(1);
    expect(smoothstep(10, 20, 15)).toBeCloseTo(0.5, 5);
  });
  it("has zero slope at the edges (eases in and out)", () => {
    const justInside = smoothstep(0, 1, 0.01);
    expect(justInside).toBeLessThan(0.01); // slower than linear at the start
  });
});

describe("proximityGlow", () => {
  it("is full inside near, zero beyond far", () => {
    expect(proximityGlow(5, 20, 120)).toBe(1);
    expect(proximityGlow(200, 20, 120)).toBe(0);
  });
  it("rises monotonically as the ship approaches", () => {
    const farther = proximityGlow(100, 20, 120);
    const nearer = proximityGlow(50, 20, 120);
    expect(nearer).toBeGreaterThan(farther);
    expect(nearer).toBeGreaterThan(0);
    expect(nearer).toBeLessThan(1);
  });
  it("degrades to a hard step when far <= near", () => {
    expect(proximityGlow(10, 20, 20)).toBe(1);
    expect(proximityGlow(30, 20, 20)).toBe(0);
  });
});

describe("approachLevel", () => {
  it("returns rest at zero glow and peak at full glow", () => {
    expect(approachLevel(0, 0.2, 1)).toBe(0.2);
    expect(approachLevel(1, 0.2, 1)).toBe(1);
  });
  it("interpolates and clamps out-of-range glow", () => {
    expect(approachLevel(0.5, 0, 2)).toBe(1);
    expect(approachLevel(5, 0.2, 1)).toBe(1);
    expect(approachLevel(-5, 0.2, 1)).toBe(0.2);
  });
});

describe("breathe", () => {
  it("stays within [1 - amount, 1 + amount]", () => {
    for (let t = 0; t < 50; t += 0.13) {
      const v = breathe(t, 0.12, 1, 3);
      expect(v).toBeGreaterThanOrEqual(1 - 0.12 - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 0.12 + 1e-9);
    }
  });
  it("different seeds diverge (emitters breathe out of sync)", () => {
    expect(breathe(2, 0.12, 1, 0)).not.toBeCloseTo(breathe(2, 0.12, 1, 5), 3);
  });
});

describe("flameFlicker", () => {
  it("stays within [1 - amount, 1 + amount]", () => {
    for (let t = 0; t < 20; t += 0.017) {
      const v = flameFlicker(t, 0.18, 1);
      expect(v).toBeGreaterThanOrEqual(1 - 0.18 - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 0.18 + 1e-9);
    }
  });
});
