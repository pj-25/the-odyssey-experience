"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useVoyage } from "@/lib/store";
import { ambience } from "@/lib/ambience";

/** Sound of the sea, opt-in. Generative WebAudio — nothing to download. */
export default function AudioToggle() {
  const embarked = useVoyage((s) => s.embarked);
  const enabled = useVoyage((s) => s.audioEnabled);
  const mode = useVoyage((s) => s.mode);
  const toggle = useVoyage((s) => s.toggleAudio);

  useEffect(() => {
    if (enabled) ambience.start();
    else ambience.stop();
    return () => ambience.stop();
  }, [enabled]);

  // Diving muffles the world
  useEffect(() => {
    ambience.setUnderwater(mode === "underwater");
  }, [mode]);

  if (!embarked) return null;

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute the sea" : "Hear the sea"}
      aria-pressed={enabled}
      className="fixed top-6 left-6 z-40 w-12 h-12 rounded-full panel flex items-center justify-center text-gold-bright hover:border-gold transition-colors cursor-pointer"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, transition: { delay: 1.6, duration: 0.8 } }}
    >
      {enabled ? (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M4 10v4h3l5 4V6l-5 4H4z" fill="currentColor" stroke="none" />
          <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M4 10v4h3l5 4V6l-5 4H4z" fill="currentColor" stroke="none" />
          <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
        </svg>
      )}
    </motion.button>
  );
}
