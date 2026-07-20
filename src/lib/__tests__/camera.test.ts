import { describe, it, expect } from "vitest";
import {
  createOrbitState,
  applyOrbitDrag,
  applyZoom,
  applyPan,
  decayOrbit,
  PITCH_MIN,
  PITCH_MAX,
  ZOOM_MIN,
  ZOOM_MAX,
  PAN_LIMIT,
  RETURN_DELAY_MS,
} from "../camera";

describe("orbit camera state", () => {
  it("drag rotates and records the input time", () => {
    const s = createOrbitState();
    applyOrbitDrag(s, 100, 50, 1000);
    expect(s.azimuth).toBeGreaterThan(0);
    expect(s.pitch).toBeGreaterThan(0);
    expect(s.lastInputAt).toBe(1000);
  });

  it("clamps pitch to its range", () => {
    const s = createOrbitState();
    applyOrbitDrag(s, 0, 100000, 0);
    expect(s.pitch).toBe(PITCH_MAX);
    applyOrbitDrag(s, 0, -200000, 0);
    expect(s.pitch).toBe(PITCH_MIN);
  });

  it("wraps azimuth so the ease-home path is short", () => {
    const s = createOrbitState();
    applyOrbitDrag(s, 100000, 0, 0); // spin far
    expect(Math.abs(s.azimuth)).toBeLessThanOrEqual(Math.PI);
  });

  it("zoom is multiplicative and clamped", () => {
    const s = createOrbitState();
    applyZoom(s, 0.5, 0);
    applyZoom(s, 0.5, 0);
    applyZoom(s, 0.001, 0);
    expect(s.zoom).toBe(ZOOM_MIN);
    applyZoom(s, 1000, 0);
    expect(s.zoom).toBe(ZOOM_MAX);
  });

  it("pan is clamped to its window", () => {
    const s = createOrbitState();
    applyPan(s, -10000, 10000, 0);
    expect(s.panX).toBe(PAN_LIMIT);
    expect(s.panY).toBe(PAN_LIMIT);
  });

  it("holds framing while the visitor is active", () => {
    const s = createOrbitState();
    applyOrbitDrag(s, 200, 0, 5000);
    const before = s.azimuth;
    decayOrbit(s, 0.5, 5000 + RETURN_DELAY_MS - 100);
    expect(s.azimuth).toBe(before);
  });

  it("eases rotation and pan home after idling, but keeps zoom", () => {
    const s = createOrbitState();
    applyOrbitDrag(s, 200, 80, 0);
    applyPan(s, 100, -60, 0);
    applyZoom(s, 1.6, 0);
    const zoom = s.zoom;
    let now = RETURN_DELAY_MS + 1;
    for (let i = 0; i < 400; i++) {
      decayOrbit(s, 1 / 60, now);
      now += 1000 / 60;
    }
    expect(s.azimuth).toBe(0);
    expect(s.pitch).toBe(0);
    expect(s.panX).toBe(0);
    expect(s.panY).toBe(0);
    expect(s.zoom).toBe(zoom);
  });
});
