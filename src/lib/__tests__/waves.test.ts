import { describe, it, expect } from "vitest";
import { waveHeight, waveSlope, WAVE_COMPONENTS } from "../waves";

describe("waveHeight", () => {
  it("is zero everywhere when amplitude is zero", () => {
    expect(waveHeight(12.3, -4.5, 99, 0)).toBeCloseTo(0, 12);
  });

  it("scales linearly with waveAmp", () => {
    const h1 = waveHeight(3, 7, 1.5, 1);
    const h2 = waveHeight(3, 7, 1.5, 2);
    expect(h2).toBeCloseTo(h1 * 2, 10);
  });

  it("stays within the theoretical amplitude bound", () => {
    const maxAmp = WAVE_COMPONENTS.reduce((s, w) => s + w.amp, 0);
    for (let i = 0; i < 200; i++) {
      const h = waveHeight(i * 1.7, i * -2.3, i * 0.31, 1);
      expect(Math.abs(h)).toBeLessThanOrEqual(maxAmp + 1e-9);
    }
  });

  it("varies over time (the sea is never still)", () => {
    const a = waveHeight(0, 0, 0, 1);
    const b = waveHeight(0, 0, 1, 1);
    expect(a).not.toBeCloseTo(b, 5);
  });
});

describe("waveSlope", () => {
  it("returns zero slope on a flat sea", () => {
    const s = waveSlope(5, 5, 2, 0);
    expect(s.dx).toBeCloseTo(0, 12);
    expect(s.dz).toBeCloseTo(0, 12);
  });

  it("approximates the height field's finite differences", () => {
    const e = 0.6;
    const { dx } = waveSlope(2, 3, 1, 1);
    const manual =
      (waveHeight(2 + e, 3, 1, 1) - waveHeight(2 - e, 3, 1, 1)) / (2 * e);
    expect(dx).toBeCloseTo(manual, 10);
  });
});
