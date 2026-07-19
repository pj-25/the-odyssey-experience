"use client";

import { useEffect, useRef, useState } from "react";
import { helmInput, useVoyage } from "@/lib/store";
import { useIsTouchDevice } from "@/lib/device";

/**
 * The touch tiller: drag anywhere on open water to steer — left of the
 * start point turns to port, right to starboard — with a small tiller
 * arc under the thumb for feedback. Sits beneath all panels and buttons,
 * so taps on real controls never reach it.
 */

const TILLER_RANGE_PX = 110;

export default function TouchHelm() {
  const embarked = useVoyage((s) => s.embarked);
  const mode = useVoyage((s) => s.mode);
  const isTouch = useIsTouchDevice();
  const [drag, setDrag] = useState<{ x: number; y: number; dx: number } | null>(
    null,
  );
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);

  // Never leave the rudder jammed if we unmount mid-drag
  useEffect(() => {
    return () => {
      helmInput.touchRudder = 0;
    };
  }, []);

  // Underwater, taps belong to the world (the amphora) — no tiller layer
  if (!embarked || !isTouch || mode === "underwater") return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, dx: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    const dx = Math.max(
      -TILLER_RANGE_PX,
      Math.min(TILLER_RANGE_PX, e.clientX - startX.current),
    );
    helmInput.touchRudder = dx / TILLER_RANGE_PX;
    setDrag((d) => (d ? { ...d, dx } : d));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    helmInput.touchRudder = 0;
    setDrag(null);
  };

  return (
    <div
      className="fixed inset-0 z-10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-hidden="true"
    >
      {drag && (
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
