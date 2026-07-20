/**
 * User-driven orbital camera state: rotate, zoom, and pan offsets layered
 * on top of the chase camera. Pure update functions (tested) mutate a
 * module singleton that the scene reads per frame.
 *
 * Philosophy: the visitor may always look, but the ship keeps sailing —
 * manual rotation and pan ease back to the composed follow shot after a
 * few idle seconds. Zoom is a preference, so it persists.
 */

export interface OrbitState {
  /** Extra yaw around the ship, radians (0 = straight astern) */
  azimuth: number;
  /** Extra elevation, radians (positive looks down from higher) */
  pitch: number;
  /** Distance multiplier applied to the chase camera (1 = default) */
  zoom: number;
  /** Look-target offset in view space, world units */
  panX: number;
  panY: number;
  /** Milliseconds timestamp of the last user camera input */
  lastInputAt: number;
}

export const PITCH_MIN = -0.12;
export const PITCH_MAX = 0.85;
export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 2.4;
export const PAN_LIMIT = 16;
/** Rotation/pan ease back after this much idle time */
export const RETURN_DELAY_MS = 3500;

export function createOrbitState(): OrbitState {
  return { azimuth: 0, pitch: 0, zoom: 1, panX: 0, panY: 0, lastInputAt: 0 };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Drag in screen pixels → orbit. */
export function applyOrbitDrag(
  s: OrbitState,
  dxPx: number,
  dyPx: number,
  now: number,
): void {
  s.azimuth += dxPx * 0.0052;
  // Wrap so the shortest way home is always taken when easing back
  s.azimuth = Math.atan2(Math.sin(s.azimuth), Math.cos(s.azimuth));
  s.pitch = clamp(s.pitch + dyPx * 0.0038, PITCH_MIN, PITCH_MAX);
  s.lastInputAt = now;
}

/** Wheel delta or pinch ratio → zoom (multiplicative, clamped). */
export function applyZoom(s: OrbitState, factor: number, now: number): void {
  s.zoom = clamp(s.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  s.lastInputAt = now;
}

/** Drag in screen pixels → pan of the look target, view-space. */
export function applyPan(
  s: OrbitState,
  dxPx: number,
  dyPx: number,
  now: number,
): void {
  s.panX = clamp(s.panX - dxPx * 0.035, -PAN_LIMIT, PAN_LIMIT);
  s.panY = clamp(s.panY + dyPx * 0.035, -PAN_LIMIT, PAN_LIMIT);
  s.lastInputAt = now;
}

/**
 * Ease rotation and pan home once the visitor has been idle. Zoom stays.
 * Call every frame with dt in seconds.
 */
export function decayOrbit(s: OrbitState, dt: number, now: number): void {
  if (now - s.lastInputAt < RETURN_DELAY_MS) return;
  const k = Math.min(1, dt * 1.1);
  s.azimuth += (0 - s.azimuth) * k;
  s.pitch += (0 - s.pitch) * k;
  s.panX += (0 - s.panX) * k;
  s.panY += (0 - s.panY) * k;
  // Snap the last hair's breadth so we settle exactly astern
  // (pan is in world units, so its threshold is looser)
  if (Math.abs(s.azimuth) < 1e-3) s.azimuth = 0;
  if (Math.abs(s.pitch) < 1e-3) s.pitch = 0;
  if (Math.abs(s.panX) < 0.02) s.panX = 0;
  if (Math.abs(s.panY) < 0.02) s.panY = 0;
}

/** The live orbit state the scene reads each frame. */
export const camOrbit: OrbitState = createOrbitState();
