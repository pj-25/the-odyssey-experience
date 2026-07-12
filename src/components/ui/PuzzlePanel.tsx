"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GLYPHS,
  TEMPLE_ORDER,
  templeStep,
  CAVE_STARS,
  caveStep,
  type GlyphId,
} from "@/lib/puzzles";
import { useVoyage, useExploration } from "@/lib/store";

/**
 * The world's two optional riddles. Both are forgiving — a wrong step
 * resets with a shiver, never a punishment — and both pay out in story,
 * not score.
 */

export default function PuzzlePanel() {
  const puzzle = useVoyage((s) => s.puzzle);
  const setPuzzle = useVoyage((s) => s.setPuzzle);

  return (
    <AnimatePresence>
      {puzzle && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={puzzle === "temple" ? "The temple glyphs" : "The cavern stars"}
        >
          <button
            type="button"
            aria-label="Step away"
            onClick={() => setPuzzle(null)}
            className="absolute inset-0 bg-abyss/75 backdrop-blur-sm cursor-default"
          />
          <motion.div
            className="panel relative rounded-xl w-full max-w-lg p-8"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.25 } }}
          >
            {puzzle === "temple" ? <TempleGlyphs /> : <CaveStars />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */

function TempleGlyphs() {
  const setPuzzle = useVoyage((s) => s.setPuzzle);
  const setOverlay = useVoyage((s) => s.setOverlay);
  const solveTemple = useExploration((s) => s.solveTemple);
  const [progress, setProgress] = useState<GlyphId[]>([]);
  const [shake, setShake] = useState(0);

  const click = (id: GlyphId) => {
    const result = templeStep(progress, id);
    if (!result.accepted) {
      setShake((s) => s + 1);
      setProgress([]);
      return;
    }
    setProgress(result.progress);
    if (result.solved) {
      solveTemple();
      setPuzzle(null);
      setOverlay("temple-awakened");
    }
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-epic text-gold mb-2">
        The ring of glyphs
      </p>
      <h2 className="font-display text-3xl font-light text-ink">Wake the Watcher</h2>
      <p className="font-display italic text-ink-dim mt-2 leading-relaxed">
        The inscription reads: “All things in their order — the dawn that
        calls, the sea that carries, the storm that tries, the home that
        waits.”
      </p>
      <div className="rule-gold my-5" />

      <motion.div
        key={shake}
        className="grid grid-cols-4 gap-4"
        initial={shake > 0 ? { x: -8 } : false}
        animate={{ x: 0, transition: { type: "spring", stiffness: 900, damping: 12 } }}
      >
        {GLYPHS.map((glyph) => {
          const done = progress.includes(glyph.id);
          return (
            <button
              key={glyph.id}
              type="button"
              onClick={() => click(glyph.id)}
              aria-label={`Glyph of ${glyph.name}`}
              aria-pressed={done}
              className={`aspect-square rounded-lg border flex items-center justify-center transition-all duration-300 cursor-pointer ${
                done
                  ? "border-gold bg-gold/15 shadow-[0_0_18px_rgba(201,168,106,0.35)]"
                  : "border-gold/25 hover:border-gold/60 hover:bg-gold/5"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-9 h-9" aria-hidden="true">
                <path d={glyph.path} fill={done ? "#e8cf9e" : "#97a3bd"} />
              </svg>
            </button>
          );
        })}
      </motion.div>

      <div className="flex justify-center gap-2 mt-6" aria-label="Progress">
        {TEMPLE_ORDER.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < progress.length ? "bg-gold-bright" : "bg-ink-dim/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CaveStars() {
  const setPuzzle = useVoyage((s) => s.setPuzzle);
  const setOverlay = useVoyage((s) => s.setOverlay);
  const solveCave = useExploration((s) => s.solveCave);
  const [progress, setProgress] = useState<number[]>([]);
  const [shake, setShake] = useState(0);

  const click = (id: number) => {
    const result = caveStep(progress, id);
    if (!result.accepted) {
      setShake((s) => s + 1);
      setProgress([]);
      return;
    }
    setProgress(result.progress);
    if (result.solved) {
      solveCave();
      setPuzzle(null);
      setOverlay("cave-lit");
    }
  };

  // Lines between consecutively joined stars
  const joined = progress.map((id) => CAVE_STARS.find((s) => s.id === id)!);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-epic text-gold mb-2">
        The cavern ceiling
      </p>
      <h2 className="font-display text-3xl font-light text-ink">Join the Lantern</h2>
      <p className="font-display italic text-ink-dim mt-2 leading-relaxed">
        “Join the lights as the spark falls — from the crown, down, to the
        tail.”
      </p>
      <div className="rule-gold my-5" />

      <motion.div
        key={shake}
        initial={shake > 0 ? { x: -8 } : false}
        animate={{ x: 0, transition: { type: "spring", stiffness: 900, damping: 12 } }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full rounded-lg bg-abyss/70 border border-gold/15"
          role="group"
          aria-label="Five cavern stars"
        >
          {joined.slice(0, -1).map((s, i) => {
            const n = joined[i + 1];
            return (
              <line
                key={i}
                x1={s.x} y1={s.y} x2={n.x} y2={n.y}
                stroke="#e8cf9e"
                strokeWidth="0.5"
                opacity="0.7"
              />
            );
          })}
          {CAVE_STARS.map((star) => {
            const done = progress.includes(star.id);
            return (
              <g key={star.id}>
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={done ? 2.4 : 1.6}
                  fill={done ? "#e8cf9e" : "#6fd8d0"}
                  opacity={done ? 1 : 0.8}
                >
                  {!done && (
                    <animate
                      attributeName="opacity"
                      values="0.8;0.4;0.8"
                      dur={`${1.6 + star.id * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
                {/* Generous invisible hit area */}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r="7"
                  fill="transparent"
                  role="button"
                  aria-label={`Star ${star.id + 1}`}
                  className="cursor-pointer"
                  onClick={() => click(star.id)}
                />
              </g>
            );
          })}
        </svg>
      </motion.div>

      <div className="flex justify-center gap-2 mt-6" aria-label="Progress">
        {CAVE_STARS.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < progress.length ? "bg-gold-bright" : "bg-ink-dim/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
