import { describe, it, expect } from "vitest";
import {
  stepShip,
  sailEfficiency,
  wrapAngle,
  windAt,
  bearingTo,
  compassLabel,
  MAX_SPEED,
  type ShipState,
} from "../sailing";

const calm: ShipState = { x: 0, z: 0, heading: 0, speed: 0 };

describe("wrapAngle", () => {
  it("wraps into (-PI, PI]", () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 10);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 10);
    expect(wrapAngle(0.4)).toBeCloseTo(0.4, 10);
  });
});

describe("sailEfficiency", () => {
  const wind = { direction: 0, strength: 1 };
  it("is full on a dead run", () => {
    expect(sailEfficiency(0, wind)).toBeCloseTo(1, 5);
  });
  it("never stalls completely against the wind", () => {
    expect(sailEfficiency(Math.PI, wind)).toBeGreaterThanOrEqual(0.18);
  });
  it("is symmetric port/starboard", () => {
    expect(sailEfficiency(0.8, wind)).toBeCloseTo(sailEfficiency(-0.8, wind), 10);
  });
});

describe("stepShip", () => {
  const wind = { direction: 0, strength: 1 };

  it("accelerates toward wind-driven target speed with sails up", () => {
    let s = calm;
    for (let i = 0; i < 600; i++) {
      s = stepShip(s, { rudder: 0, sailsUp: true }, wind, 1 / 60);
    }
    expect(s.speed).toBeGreaterThan(MAX_SPEED * 0.9);
    expect(s.speed).toBeLessThanOrEqual(MAX_SPEED);
  });

  it("moves along its heading (heading 0 = -Z)", () => {
    let s: ShipState = { ...calm, speed: 10 };
    s = stepShip(s, { rudder: 0, sailsUp: true }, wind, 1);
    expect(s.z).toBeLessThan(0);
    expect(Math.abs(s.x)).toBeLessThan(1e-9);
  });

  it("turns starboard with positive rudder", () => {
    let s: ShipState = { ...calm, speed: 8 };
    s = stepShip(s, { rudder: 1, sailsUp: true }, wind, 0.5);
    expect(s.heading).toBeGreaterThan(0);
  });

  it("slows to a drift when sails are furled", () => {
    let s: ShipState = { ...calm, speed: 12 };
    for (let i = 0; i < 900; i++) {
      s = stepShip(s, { rudder: 0, sailsUp: false }, wind, 1 / 60);
    }
    expect(s.speed).toBeLessThan(1);
  });

  it("is deterministic for identical inputs", () => {
    const a = stepShip(calm, { rudder: 1, sailsUp: true }, wind, 0.016);
    const b = stepShip(calm, { rudder: 1, sailsUp: true }, wind, 0.016);
    expect(a).toEqual(b);
  });
});

describe("windAt", () => {
  it("stays within sane bounds over a long session", () => {
    for (let t = 0; t < 4000; t += 13) {
      const w = windAt(t);
      expect(w.strength).toBeGreaterThanOrEqual(0.4);
      expect(w.strength).toBeLessThanOrEqual(1);
      expect(Math.abs(w.direction)).toBeLessThanOrEqual(Math.PI);
    }
  });
});

describe("bearings", () => {
  it("points north (0) toward -Z", () => {
    expect(bearingTo(0, 0, 0, -10)).toBeCloseTo(0, 10);
  });
  it("points east (PI/2) toward +X", () => {
    expect(bearingTo(0, 0, 10, 0)).toBeCloseTo(Math.PI / 2, 10);
  });
  it("labels the compass points", () => {
    expect(compassLabel(0)).toBe("N");
    expect(compassLabel(Math.PI / 2)).toBe("E");
    expect(compassLabel(Math.PI)).toBe("S");
    expect(compassLabel(-Math.PI / 2)).toBe("W");
    expect(compassLabel(Math.PI / 4)).toBe("NE");
  });
});
