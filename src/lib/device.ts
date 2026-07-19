"use client";

import { useSyncExternalStore } from "react";

/** Capability probes — computed once, safe on the server. */

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;
}

const noopSubscribe = () => () => {};
const serverSnapshot = () => false;

/** SSR-safe hook: false on the server, the real capability after hydration. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(noopSubscribe, isTouchDevice, serverSnapshot);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A short tactile pulse where the platform offers one. */
export function haptic(pattern: number | number[] = 24): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // some browsers throw on vibrate without user activation — fine
    }
  }
}
