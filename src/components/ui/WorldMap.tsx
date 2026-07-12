"use client";

import { useRef, useState } from "react";
import { useMemoryBoard } from "@/lib/store";

/**
 * An ancient-chart world map. Continents are deliberately loose, hand-drawn
 * shapes — a navigator's sketch, not an atlas — with a light burning for
 * every traveller who has joined the voyage.
 *
 * Click anywhere on the chart to add your own light.
 */

// Rough continent silhouettes in a 100 × 80 viewBox (equirectangular-ish)
const CONTINENTS: string[] = [
  // North America
  "M8,18 Q13,12 21,13 Q29,11 33,16 Q31,22 28,26 Q26,33 22,38 Q18,42 15,38 Q10,32 9,26 Q6,22 8,18 Z",
  // South America
  "M24,48 Q29,45 32,49 Q34,55 32,62 Q30,69 27,72 Q24,69 23,62 Q22,54 24,48 Z",
  // Europe
  "M43,22 Q48,18 53,20 Q56,23 54,27 Q50,30 47,32 Q44,30 43,26 Z",
  // Africa
  "M44,36 Q50,33 55,36 Q57,42 55,49 Q52,56 49,61 Q46,57 44,50 Q42,42 44,36 Z",
  // Asia
  "M56,16 Q66,12 77,15 Q86,18 88,25 Q85,32 80,36 Q74,41 68,42 Q62,38 58,32 Q55,24 56,16 Z",
  // Southeast Asia / Indonesia hint
  "M76,46 Q80,44 83,47 Q81,50 77,50 Q75,48 76,46 Z",
  // Australia
  "M82,62 Q88,59 92,63 Q91,69 86,71 Q81,69 82,62 Z",
];

export default function WorldMap() {
  const lights = useMemoryBoard((s) => s.mapLights);
  const addMapLight = useMemoryBoard((s) => s.addMapLight);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 80;
    setPending({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    addMapLight({ ...pending, label: label.trim() || "A distant harbour" });
    setPending(null);
    setLabel("");
  };

  const mine = lights.filter((l) => l.mine).length;

  return (
    <div>
      <p className="text-sm text-ink-dim mb-4">
        {`${lights.length.toLocaleString()} lights burning across the world.`}{" "}
        Click the chart to mark where you&apos;ll watch from.
      </p>

      <svg
        ref={svgRef}
        viewBox="0 0 100 80"
        role="img"
        aria-label="World map showing where travellers are joining from"
        onClick={handleMapClick}
        className="w-full rounded-lg border border-gold/20 bg-abyss/50 cursor-crosshair"
      >
        {/* Graticule */}
        {[16, 32, 48, 64].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(151,163,189,0.08)" strokeWidth="0.2" />
        ))}
        {[20, 40, 60, 80].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="80" stroke="rgba(151,163,189,0.08)" strokeWidth="0.2" />
        ))}

        {/* Continents — a navigator's sketch */}
        {CONTINENTS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="rgba(201,168,106,0.06)"
            stroke="rgba(201,168,106,0.35)"
            strokeWidth="0.35"
          />
        ))}

        {/* Traveller lights */}
        {lights.map((l) => (
          <g key={l.id}>
            <circle cx={l.x} cy={l.y} r={l.mine ? 1.5 : 1} fill={l.mine ? "#e8cf9e" : "#c9a86a"} opacity="0.9">
              <animate
                attributeName="opacity"
                values="0.9;0.35;0.9"
                dur={`${2 + ((l.x * 7 + l.y * 13) % 30) / 10}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={l.x} cy={l.y} r={l.mine ? 3 : 2.2} fill="none" stroke={l.mine ? "#e8cf9e" : "#c9a86a"} strokeWidth="0.15" opacity="0.4" />
            <title>{l.label}</title>
          </g>
        ))}

        {/* Pending light preview */}
        {pending && (
          <circle cx={pending.x} cy={pending.y} r="1.6" fill="none" stroke="#e8cf9e" strokeWidth="0.3" strokeDasharray="0.8 0.5" />
        )}
      </svg>

      {pending && (
        <form onSubmit={confirm} className="mt-3 flex gap-2">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name your harbour (e.g. Lisbon)"
            maxLength={40}
            aria-label="Location name"
            className="flex-1 bg-abyss/60 border border-gold/20 rounded px-3 py-2 text-sm placeholder:text-ink-dim/50"
          />
          <button
            type="submit"
            className="px-4 py-1.5 text-xs uppercase tracking-widest text-abyss bg-gold-bright rounded-full hover:bg-gold transition-colors cursor-pointer"
          >
            Light it
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="px-3 text-xs text-ink-dim hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {mine > 0 && !pending && (
        <p className="text-xs text-gold-bright/80 mt-3">
          ✦ Your light{mine > 1 ? "s are" : " is"} burning on the chart.
        </p>
      )}
    </div>
  );
}
