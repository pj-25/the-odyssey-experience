/** Countdown helpers for the global premiere clock. */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the premiere moment has passed */
  released: boolean;
}

/** Split the time remaining until `targetIso` into display parts. */
export function countdownTo(targetIso: string, now: Date = new Date()): CountdownParts {
  const target = new Date(targetIso).getTime();
  const diff = target - now.getTime();
  if (Number.isNaN(target)) {
    throw new Error(`Invalid premiere date: ${targetIso}`);
  }
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, released: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    released: false,
  };
}

/** Two-digit display, e.g. 7 -> "07". */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
