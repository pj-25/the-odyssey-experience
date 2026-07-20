"use client";

import { useEffect, useRef, useState } from "react";
import { helmInput, useVoyage } from "@/lib/store";
import { useIsTouchDevice } from "@/lib/device";
import { camOrbit, applyOrbitDrag, applyZoom, applyPan } from "@/lib/camera";

/**
 * One layer, every hand on the helm:
 *  - touch, one finger  → the tiller (drag the sea to steer)
 *  - touch, two fingers → orbit the camera; pinch to zoom
 *  - mouse drag         → orbit; Shift/right/middle-drag → pan
 *  - wheel              → zoom
 *
 * Sits beneath all panels and buttons, so taps on real controls never
 * reach it. Hidden underwater, where taps belong to the world.
 */

const TILLER_RANGE_PX = 110;

interface PointerInfo {
  x: number;
  y: number;
  type: string;
}

export default function HelmGestures() {
  const embarked = useVoyage((s) => s.embarked);
  const mode = useVoyage((s) => s.mode);
  const isTouch = useIsTouchDevice();
  const [drag, setDrag] = useState<{ x: number; y: number; dx: number } | null>(
    null,
  );
  const pointers = useRef(new Map<number, PointerInfo>());
  const steerId = useRef<number | null>(null);
  const steerStartX = useRef(0);
  const pinchDist = useRef(0);
  const pinchMid = useRef({ x: 0, y: 0 });

  // Never leave the rudder jammed if we unmount mid-drag
  useEffect(() => {
    return () => {
      helmInput.touchRudder = 0;
    };
  }, []);

  // Wheel zoom, window-wide (the page never scrolls)
  useEffect(() => {
    if (!embarked) return;
    const onWheel = (e: WheelEvent) => {
      if (useVoyage.getState().mode === "underwater") return;
      applyZoom(camOrbit, 1 + e.deltaY * 0.0011, performance.now());
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [embarked]);

  // Underwater, taps belong to the world (the amphora) — no gesture layer
  if (!embarked || mode === "underwater") return null;

  const endSteer = () => {
    steerId.current = null;
    helmInput.touchRudder = 0;
    setDrag(null);
  };

  const beginPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    pinchMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (e.pointerType === "touch") {
      const touches = [...pointers.current.values()].filter(
        (p) => p.type === "touch",
      );
      if (touches.length === 1) {
        steerId.current = e.pointerId;
        steerStartX.current = e.clientX;
        setDrag({ x: e.clientX, y: e.clientY, dx: 0 });
      } else if (touches.length === 2) {
        // Second finger promotes the gesture to camera control
        endSteer();
        beginPinch();
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
    const now = performance.now();

    if (e.pointerType === "mouse") {
      if (e.buttons === 0) return;
      const panning = e.shiftKey || (e.buttons & 6) !== 0; // right/middle
      if (panning) applyPan(camOrbit, dx, dy, now);
      else applyOrbitDrag(camOrbit, dx, dy, now);
      return;
    }

    // Touch
    const touches = [...pointers.current.values()].filter(
      (p) => p.type === "touch",
    );
    if (touches.length >= 2) {
      const [a, b] = touches;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0 && dist > 0) {
        applyZoom(camOrbit, pinchDist.current / dist, now);
      }
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      applyOrbitDrag(
        camOrbit,
        mid.x - pinchMid.current.x,
        mid.y - pinchMid.current.y,
        now,
      );
      pinchDist.current = dist;
      pinchMid.current = mid;
    } else if (e.pointerId === steerId.current) {
      const tiller = Math.max(
        -TILLER_RANGE_PX,
        Math.min(TILLER_RANGE_PX, e.clientX - steerStartX.current),
      );
      helmInput.touchRudder = tiller / TILLER_RANGE_PX;
      setDrag((d) => (d ? { ...d, dx: tiller } : d));
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (e.pointerId === steerId.current) endSteer();
    const touches = [...pointers.current.values()].filter(
      (p) => p.type === "touch",
    );
    // Dropping from two fingers to one ends camera control; a fresh
    // touch is required to steer again — no surprise course changes
    if (touches.length < 2) pinchDist.current = 0;
  };

  return (
    <div
      className="fixed inset-0 z-10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
      aria-hidden="true"
    >
      {isTouch && drag && (
        <div
          className="absolute pointer-events-none"
          style={{ left: drag.x, top: drag.y }}
        >
          {/* Tiller track */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[220px] h-10 rounded-full border border-gold/25 bg-abyss/30" />
          {/* Thumb */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gold-bright/90 shadow-[0_0_14px_rgba(232,207,158,0.6)]"
            style={{ transform: `translate(calc(-50% + ${drag.dx}px), -50%)` }}
          />
        </div>
      )}
    </div>
  );
}
