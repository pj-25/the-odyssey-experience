"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shipPose, useVoyage, useExploration, fragmentsOf } from "@/lib/store";
import { helmAction } from "@/components/scene/ShipController";
import { nearestSecret } from "@/lib/navigator-brain";
import { constellationForPoi } from "@/lib/constellations";
import { FRAGMENT_COUNT } from "@/lib/world";
import { wrapAngle } from "@/lib/sailing";

/**
 * The helm: a compass rose (ship's head up, gold needle = wind), speed,
 * sail state, the contextual action prompt, and the journal. Samples the
 * shared ship pose on a slow interval — never on the render loop.
 */

interface HudSample {
  heading: number;
  windRel: number;
  windStrength: number;
  speed: number;
  action: { id: string; label: string } | null;
}

export default function HelmHUD() {
  const embarked = useVoyage((s) => s.embarked);
  const sailsUp = useVoyage((s) => s.sailsUp);
  const consultingStars = useVoyage((s) => s.consultingStars);
  const mode = useVoyage((s) => s.mode);
  const cameraView = useVoyage((s) => s.cameraView);
  const toggleCameraView = useVoyage((s) => s.toggleCameraView);
  const setJournalOpen = useVoyage((s) => s.setJournalOpen);
  const fragments = useExploration((s) => fragmentsOf(s.discoveries));
  const discoveries = useExploration((s) => s.discoveries);
  const beaconLit = useExploration((s) => s.beaconLit);
  const [hud, setHud] = useState<HudSample | null>(null);
  // Open on first embark; auto-hides, re-openable from the "?" button
  const [showHelp, setShowHelp] = useState(true);

  // 8 Hz sampling keeps the HUD honest without touching the 60 fps path
  useEffect(() => {
    if (!embarked) return;
    const id = setInterval(() => {
      setHud({
        heading: shipPose.heading,
        windRel: wrapAngle(shipPose.windDirection - shipPose.heading),
        windStrength: shipPose.windStrength,
        speed: shipPose.speed,
        action: helmAction.current,
      });
    }, 125);
    return () => clearInterval(id);
  }, [embarked]);

  // The legend fades on its own a while after embarking
  useEffect(() => {
    if (!embarked) return;
    const id = setTimeout(() => setShowHelp(false), 14000);
    return () => clearTimeout(id);
  }, [embarked]);

  if (!embarked || !hud) return null;

  const starTarget = consultingStars
    ? nearestSecret({
        shipX: shipPose.x,
        shipZ: shipPose.z,
        discoveredIds: discoveries.map((d) => d.poiId),
        fragments,
        stormNearby: false,
        beaconLit,
      })
    : undefined;
  const starConstellation = starTarget && constellationForPoi(starTarget.id);

  return (
    <>
      {/* Compass + speed, bottom left */}
      <motion.div
        className="fixed bottom-6 left-6 z-20 flex items-end gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.8, duration: 1 } }}
      >
        <div className="panel rounded-full w-24 h-24 relative" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(201,168,106,0.3)" strokeWidth="1" />
            {/* Rose rotates with the world; ship's head is always up */}
            <g transform={`rotate(${(-hud.heading * 180) / Math.PI} 50 50)`}>
              <text x="50" y="16" textAnchor="middle" fill="#e8cf9e" fontSize="11" fontFamily="serif">N</text>
              <text x="50" y="92" textAnchor="middle" fill="#97a3bd" fontSize="9" fontFamily="serif">S</text>
              <text x="88" y="54" textAnchor="middle" fill="#97a3bd" fontSize="9" fontFamily="serif">E</text>
              <text x="12" y="54" textAnchor="middle" fill="#97a3bd" fontSize="9" fontFamily="serif">W</text>
            </g>
            {/* Wind needle, relative to the bow */}
            <g transform={`rotate(${(hud.windRel * 180) / Math.PI} 50 50)`}>
              <path
                d="M50 22 L54 42 L50 38 L46 42 Z"
                fill="#c9a86a"
                opacity={0.4 + hud.windStrength * 0.6}
              />
            </g>
            {/* Ship's head */}
            <path d="M50 30 L53 46 L50 43 L47 46 Z" fill="#e8ecf6" />
          </svg>
        </div>
        <div className="panel rounded-lg px-4 py-2.5 text-center">
          <div className="font-display text-2xl text-gold-bright tabular-nums leading-none">
            {(hud.speed * 0.7).toFixed(1)}
          </div>
          <div className="text-[9px] uppercase tracking-epic text-ink-dim mt-1">knots</div>
          <div className={`text-[9px] uppercase tracking-widest mt-1 ${sailsUp ? "text-gold" : "text-ink-dim/60"}`}>
            {sailsUp ? "sails set" : "sails furled"}
          </div>
        </div>
      </motion.div>

      {/* Contextual action, bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {hud.action && (
            <motion.p
              key={hud.action.id}
              className="panel rounded-full px-5 py-2 text-sm text-gold-bright"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              role="status"
            >
              <kbd className="font-display mr-2 border border-gold/40 rounded px-1.5">E</kbd>
              {hud.action.label}
            </motion.p>
          )}
          {consultingStars && starConstellation && (
            <motion.p
              key="stars"
              className="panel rounded-full px-5 py-2 text-sm text-ink"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <span className="text-gold-bright font-display">{starConstellation.name}</span>
              <span className="text-ink-dim"> burns toward a secret — follow it</span>
            </motion.p>
          )}
          {consultingStars && !starConstellation && (
            <motion.p
              key="nostars"
              className="panel rounded-full px-5 py-2 text-sm text-ink-dim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              The sky holds no more secrets for you — only stars
            </motion.p>
          )}
          {mode === "underwater" && (
            <motion.p
              key="underwater"
              className="panel rounded-full px-5 py-2 text-sm text-ink-dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Seek the glow among the ruins · <kbd className="font-display border border-gold/40 rounded px-1.5">E</kbd> to surface
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Journal + help, bottom right */}
      <motion.div
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.8, duration: 1 } }}
      >
        <button
          type="button"
          onClick={toggleCameraView}
          aria-label={
            cameraView === "chase"
              ? "Step aboard — view from the deck"
              : "Step back — view from astern"
          }
          aria-pressed={cameraView === "deck"}
          className={`panel rounded-full px-4 h-10 flex items-center gap-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
            cameraView === "deck"
              ? "text-gold-bright border-gold/60"
              : "text-ink-dim hover:text-gold-bright"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="7" width="15" height="11" rx="2" />
            <path d="M18 10.5l4-2.5v9l-4-2.5" />
          </svg>
          {cameraView === "deck" ? "On deck" : "Astern"}
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-label="Show sailing controls"
          className="panel w-10 h-10 rounded-full text-ink-dim hover:text-gold-bright transition-colors cursor-pointer"
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => setJournalOpen(true)}
          className="panel rounded-full px-5 py-2.5 text-xs uppercase tracking-widest text-gold-bright hover:border-gold transition-colors cursor-pointer"
        >
          Journal
          <span className="ml-2 text-ink-dim">
            {fragments}/{FRAGMENT_COUNT}
          </span>
        </button>
      </motion.div>

      {/* Controls legend */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed top-24 left-1/2 -translate-x-1/2 z-20 panel rounded-lg px-6 py-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="note"
            aria-label="Sailing controls"
          >
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-ink-dim justify-center">
              <span><Kbd>A</Kbd><Kbd>D</Kbd> steer</span>
              <span><Kbd>W</Kbd><Kbd>S</Kbd> trim sails</span>
              <span><Kbd>Space</Kbd> set / furl</span>
              <span><Kbd>C</Kbd> read the stars</span>
              <span><Kbd>V</Kbd> step aboard</span>
              <span><Kbd>E</Kbd> act</span>
            </div>
            <p className="text-center text-[11px] text-ink-dim/70 mt-2 font-display italic">
              The wind favours a following sea — watch the gold needle.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-display border border-gold/30 rounded px-1.5 py-0.5 mx-0.5 text-gold-bright">
      {children}
    </kbd>
  );
}
