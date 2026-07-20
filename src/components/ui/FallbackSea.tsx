"use client";

import { useEffect, useMemo } from "react";
import { useVoyage } from "@/lib/store";

/**
 * The lightweight harbour: shown when WebGL is unavailable (or `?no3d=1`).
 * A pure-CSS night sea keeps the mood, and the community heart of the
 * experience — the voyage log, the travellers' map, the Navigator — stays
 * fully open. No broken helm, no dead controls.
 */

export default function FallbackSea() {
  const embarked = useVoyage((s) => s.embarked);
  const setJournalOpen = useVoyage((s) => s.setJournalOpen);

  // With no sea to sail, embarking leads straight to the gathering
  useEffect(() => {
    if (!embarked) return;
    const id = setTimeout(() => setJournalOpen(true), 1400);
    return () => clearTimeout(id);
  }, [embarked, setJournalOpen]);

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: `${(i * 37.31 + 11) % 100}%`,
        top: `${(i * 23.17 + 5) % 62}%`,
        size: 1 + ((i * 7) % 3) * 0.5,
        delay: `${(i * 0.61) % 5}s`,
      })),
    [],
  );

  return (
    <div className="fixed inset-0" aria-hidden="true">
      {/* Sky into sea */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050a14_0%,#0a1526_58%,#0a1a2e_60%,#04090f_100%)]" />
      {/* Moon and its halo */}
      <div className="absolute left-[18%] top-[14%] w-16 h-16 rounded-full bg-[#e8eeff] shadow-[0_0_70px_28px_rgba(184,204,245,0.3)]" />
      {/* Moon path shimmering on the water */}
      <div className="absolute left-[16%] top-[60%] w-24 h-[36%] bg-gradient-to-b from-[rgba(207,224,255,0.35)] to-transparent blur-xl animate-pulse" />
      {/* Stars */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#d2dcf5] animate-pulse"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: "3.4s",
          }}
        />
      ))}
      {embarked && (
        <p className="absolute bottom-6 inset-x-0 text-center text-xs text-ink-dim/70 px-6">
          Your device sails light — the full 3D sea isn&apos;t available here,
          but the harbour is open: the voyage log, the travellers&apos; map,
          and the Navigator await.
        </p>
      )}
    </div>
  );
}
