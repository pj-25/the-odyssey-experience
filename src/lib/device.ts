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

let webglProbe: boolean | null = null;

/**
 * Can this browser raise the full 3D sea? Probed once. `?no3d=1` forces
 * the lightweight harbour — an escape hatch for struggling devices and
 * for testing the fallback.
 */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return true;
  if (webglProbe !== null) return webglProbe;
  try {
    if (new URLSearchParams(window.location.search).has("no3d")) {
      webglProbe = false;
      return false;
    }
    const canvas = document.createElement("canvas");
    webglProbe = Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    webglProbe = false;
  }
  return webglProbe;
}

const serverTrue = () => true;

/** SSR-safe hook form of the WebGL probe. */
export function useSupportsWebGL(): boolean {
  return useSyncExternalStore(noopSubscribe, supportsWebGL, serverTrue);
}

let reducedMotionQuery: MediaQueryList | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  reducedMotionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery.matches;
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
