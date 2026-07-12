import { describe, it, expect } from "vitest";
import { countdownTo, pad2 } from "../time";

describe("countdownTo", () => {
  const premiere = "2026-07-17T00:00:00Z";

  it("splits the remaining time into days/hours/minutes/seconds", () => {
    const now = new Date("2026-07-12T10:30:15Z");
    const parts = countdownTo(premiere, now);
    expect(parts).toEqual({
      days: 4,
      hours: 13,
      minutes: 29,
      seconds: 45,
      released: false,
    });
  });

  it("reports released once the premiere has passed", () => {
    const now = new Date("2026-07-17T00:00:01Z");
    expect(countdownTo(premiere, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      released: true,
    });
  });

  it("treats the exact premiere moment as released", () => {
    const now = new Date(premiere);
    expect(countdownTo(premiere, now).released).toBe(true);
  });

  it("throws on an invalid date string", () => {
    expect(() => countdownTo("not-a-date")).toThrow(/Invalid premiere date/);
  });
});

describe("pad2", () => {
  it("pads single digits", () => {
    expect(pad2(7)).toBe("07");
  });
  it("leaves two digits alone", () => {
    expect(pad2(42)).toBe("42");
  });
});
