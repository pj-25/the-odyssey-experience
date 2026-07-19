import { describe, it, expect } from "vitest";
import {
  environmentAt,
  stormIntensityAt,
  ENV_PRESETS,
  POIS,
  FRAGMENT_COUNT,
  STORM,
  getPoi,
} from "../world";

describe("world layout", () => {
  it("has exactly five fragment-bearing places", () => {
    expect(FRAGMENT_COUNT).toBe(5);
  });

  it("hides only the city beyond the fog", () => {
    expect(POIS.filter((p) => p.hidden).map((p) => p.id)).toEqual([
      "hiddenCity",
    ]);
  });

  it("keeps places apart — no overlapping discovery zones", () => {
    for (let i = 0; i < POIS.length; i++) {
      for (let j = i + 1; j < POIS.length; j++) {
        const a = POIS[i];
        const b = POIS[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        expect(d).toBeGreaterThan(a.radius + b.radius);
      }
    }
  });
});

describe("stormIntensityAt", () => {
  it("is calm far away and full at the centre", () => {
    expect(stormIntensityAt(0, 60)).toBe(0);
    expect(stormIntensityAt(STORM.x, STORM.z)).toBe(1);
  });
  it("builds gradually across the rim", () => {
    const mid = stormIntensityAt(
      STORM.x + STORM.radius * 0.65,
      STORM.z,
    );
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("environmentAt", () => {
  it("is calm harbour water near home", () => {
    const home = getPoi("harbor")!;
    const env = environmentAt(home.x, home.z);
    expect(env.waveAmp).toBeLessThan(ENV_PRESETS.openSea.waveAmp);
  });

  it("is heavy weather inside the storm", () => {
    const env = environmentAt(STORM.x, STORM.z);
    expect(env.waveAmp).toBeGreaterThan(2);
    expect(env.fogDensity).toBeGreaterThan(ENV_PRESETS.openSea.fogDensity);
  });

  it("returns open sea in empty water", () => {
    const env = environmentAt(400, 400);
    expect(env.waveAmp).toBeCloseTo(ENV_PRESETS.openSea.waveAmp, 3);
  });

  it("always produces valid hex colours", () => {
    for (const [x, z] of [
      [0, 60], [STORM.x, STORM.z], [-70, -260], [123, -456],
    ]) {
      const env = environmentAt(x, z);
      for (const c of [env.fogColor, env.waterColor, env.skyColor]) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe("resolveCollision", () => {
  it("leaves open water untouched", async () => {
    const { resolveCollision } = await import("../world");
    const r = resolveCollision(50, -50);
    expect(r).toEqual({ x: 50, z: -50, hit: false });
  });

  it("slides the ship out of an island core", async () => {
    const { resolveCollision, KEEP_OUTS } = await import("../world");
    const core = KEEP_OUTS[0];
    const r = resolveCollision(core.x + 2, core.z);
    expect(r.hit).toBe(true);
    expect(Math.hypot(r.x - core.x, r.z - core.z)).toBeCloseTo(core.r, 6);
  });

  it("leaves the Siren Gates passage sailable", async () => {
    const { resolveCollision } = await import("../world");
    // Midway between the two cliff cores
    const r = resolveCollision(-150, -89);
    expect(r.hit).toBe(false);
  });

  it("keeps every interaction reachable from outside its core", async () => {
    const { resolveCollision, getPoi } = await import("../world");
    // E-action ranges from ShipController: beacon 34, temple 38, cave 32
    for (const [id, range] of [["beacon", 34], ["temple", 38], ["cave", 32]] as const) {
      const p = getPoi(id)!;
      const r = resolveCollision(p.x, p.z); // teleported dead-centre
      const d = Math.hypot(r.x - p.x, r.z - p.z);
      expect(d).toBeLessThan(range);
    }
  });
});
