"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useVoyage } from "@/lib/store";
import Countdown from "./Countdown";

/** The threshold: title, countdown, and the invitation to embark. */
export default function Hero() {
  const embarked = useVoyage((s) => s.embarked);
  const embark = useVoyage((s) => s.embark);

  return (
    <AnimatePresence>
      {!embarked && (
        <motion.div
          key="hero"
          className="fixed inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
          exit={{ opacity: 0, transition: { duration: 1.6, ease: "easeInOut" } }}
        >
          {/* Vignette so the title floats on the sea without a hard panel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,10,20,0.55)_0%,rgba(5,10,20,0.15)_55%,transparent_100%)]" />

          <motion.p
            className="relative text-xs sm:text-sm uppercase tracking-epic text-ink-dim mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 1.4 } }}
          >
            A voyage for everyone awaiting the film
          </motion.p>

          <motion.h1
            className="relative font-display text-[10.5vw] leading-none sm:text-8xl md:text-9xl text-ink font-light"
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            animate={{
              opacity: 1,
              letterSpacing: "0.12em",
              transition: { delay: 0.2, duration: 2.2, ease: "easeOut" },
            }}
          >
            THE&nbsp;ODYSSEY
          </motion.h1>

          <motion.p
            className="relative font-display italic text-lg sm:text-2xl text-ink-dim mt-4 max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.4, duration: 1.6 } }}
          >
            A film by Christopher Nolan — and a sea we cross together.
          </motion.p>

          <motion.div
            className="relative mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 2.0, duration: 1.4 } }}
          >
            <Countdown />
          </motion.div>

          <motion.button
            type="button"
            onClick={embark}
            className="relative mt-12 px-10 py-3.5 font-display text-lg tracking-epic uppercase text-gold-bright border border-gold/40 rounded-full hover:bg-gold/10 hover:border-gold transition-colors duration-500 cursor-pointer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 2.6, duration: 1.4 } }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Take the Helm
          </motion.button>

          <motion.p
            className="relative mt-6 text-xs text-ink-dim/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 3.4, duration: 1.5 } }}
          >
            An open sea · Sail anywhere · Headphones recommended · No spoilers aboard
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
