"use client";

import { useEffect, useState } from "react";
import { countdownTo, pad2, type CountdownParts } from "@/lib/time";
import { PREMIERE_ISO } from "@/lib/world";

/** Global premiere countdown — the shared clock every visitor sails under. */
export default function Countdown({ compact = false }: { compact?: boolean }) {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const tick = () => setParts(countdownTo(PREMIERE_ISO));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!parts) {
    // Server render / first paint: keep layout stable, reveal on hydration
    return <div className={compact ? "h-10" : "h-16"} aria-hidden="true" />;
  }

  if (parts.released) {
    return (
      <p
        className="font-display text-gold-bright text-xl tracking-epic uppercase"
        role="status"
      >
        The Odyssey is in theatres
      </p>
    );
  }

  const cells: Array<[string, string]> = [
    [String(parts.days), "days"],
    [pad2(parts.hours), "hours"],
    [pad2(parts.minutes), "min"],
    [pad2(parts.seconds), "sec"],
  ];

  return (
    <div
      role="timer"
      aria-label={`${parts.days} days ${parts.hours} hours ${parts.minutes} minutes until the global premiere`}
      className={`flex items-baseline justify-center gap-4 sm:gap-6 ${compact ? "" : "sm:gap-8"}`}
    >
      {cells.map(([value, label]) => (
        <div key={label} className="text-center">
          <div
            className={`font-display tabular-nums text-gold-bright ${
              compact ? "text-2xl" : "text-4xl sm:text-5xl"
            }`}
          >
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-epic text-ink-dim mt-1">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
