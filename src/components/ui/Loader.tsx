"use client";

import { motion } from "framer-motion";

/**
 * Shown while the 3D world code-splits in. Doubles as the graceful
 * fallback backdrop if WebGL is unavailable — the words still carry.
 */
export default function Loader() {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-abyss">
      <motion.div
        className="w-px h-16 bg-gradient-to-b from-transparent via-gold to-transparent"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <p className="mt-6 text-xs uppercase tracking-epic text-ink-dim" role="status">
        Raising the sails
      </p>
    </div>
  );
}
