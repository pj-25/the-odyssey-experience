import { describe, it, expect } from "vitest";
import {
  halfBeam,
  keelDepth,
  sheerHeight,
  hullPoint,
  HULL_BEAM,
  HULL_LENGTH,
} from "../hull";

describe("hull lines", () => {
  it("comes to a point at bow and stern", () => {
    expect(halfBeam(0)).toBeCloseTo(0, 6);
    expect(halfBeam(1)).toBeCloseTo(0, 6);
  });

  it("is fullest amidships and symmetric fore/aft", () => {
    expect(halfBeam(0.5)).toBeCloseTo(HULL_BEAM, 6);
    expect(halfBeam(0.3)).toBeCloseTo(halfBeam(0.7), 10);
    expect(halfBeam(0.3)).toBeLessThan(halfBeam(0.5));
  });

  it("draws deepest amidships, shallow at the ends", () => {
    expect(keelDepth(0.5)).toBeGreaterThan(keelDepth(0.05));
    expect(keelDepth(0.02)).toBeGreaterThan(0); // never zero — the stem runs on
  });

  it("sheers up toward bow and stern", () => {
    expect(sheerHeight(0)).toBeGreaterThan(sheerHeight(0.5));
    expect(sheerHeight(1)).toBeGreaterThan(sheerHeight(0.5));
    expect(sheerHeight(0.25)).toBeCloseTo(sheerHeight(0.75), 10);
  });

  it("skins from keel to gunwale on each side", () => {
    const [xk, yk] = hullPoint(0.5, 0, 1);
    const [xg, yg] = hullPoint(0.5, 1, 1);
    expect(xk).toBeCloseTo(0, 6); // keel is on centreline
    expect(yk).toBeLessThan(0); // below the waterline
    expect(xg).toBeCloseTo(HULL_BEAM, 6); // gunwale at full beam
    expect(yg).toBeGreaterThan(0);
    const [xp] = hullPoint(0.5, 1, -1);
    expect(xp).toBeCloseTo(-xg, 10); // port mirrors starboard
  });

  it("runs stern (+z) to bow (−z) along the keel", () => {
    expect(hullPoint(0, 0.5, 1)[2]).toBeCloseTo(HULL_LENGTH / 2, 6);
    expect(hullPoint(1, 0.5, 1)[2]).toBeCloseTo(-HULL_LENGTH / 2, 6);
  });
});
