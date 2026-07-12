"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getPoi } from "@/lib/world";
import { useVoyage } from "@/lib/store";

/**
 * The story layer. Shows when the world answers exploration: a place
 * discovered, a storm survived, a fire lit, a memory raised from the deep.
 */

interface EventCard {
  kicker: string;
  title: string;
  subtitle: string;
  epigraph?: string;
  epigraphSource?: string;
  body: string;
}

const EVENT_CARDS: Record<string, EventCard> = {
  storm: {
    kicker: "Trial endured",
    title: "The Storm",
    subtitle: "Courage and sacrifice",
    epigraph:
      "Moreover I have suffered much, and toiled much, both by waves and war; let this also be added to the rest.",
    epigraphSource: "Homer, The Odyssey — Book V",
    body: "You sailed in when you could have sailed around. No storm lasts — but while it raged it asked its question, and you answered at the helm. The sailor leaving this weather is not quite the one who entered it.",
  },
  "beacon-lit": {
    kicker: "The fire answers",
    title: "Watchfire Lit",
    subtitle: "One flame among thousands",
    body: "The brazier takes the flame like it never forgot how to burn. Somewhere beyond the horizon, other travellers' fires are answering tonight — and look north: the sky itself has caught the signal, and is dancing.",
  },
  artifact: {
    kicker: "Raised from the deep",
    title: "The Amphora",
    subtitle: "A memory of the drowned world",
    epigraph:
      "As a man may bury a lamp in the ashes to keep the seed of fire alive.",
    epigraphSource: "Homer, The Odyssey — Book V",
    body: "It is warm in your hands, fathoms below the light. Whatever the sunken city was, it wanted one thing remembered — and chose you to carry it up. The chart takes another fragment.",
  },
  "temple-awakened": {
    kicker: "The glyphs remember",
    title: "The Watcher Wakes",
    subtitle: "Dawn, sea, storm, home",
    body: "Stone grinds against three thousand years of stillness. The Watcher's eyes kindle gold, and for a moment the whole ruin stands the way it stood when it was young. It inclines its head — the smallest bow — and the chart takes another fragment.",
  },
  "cave-lit": {
    kicker: "The lantern joined",
    title: "The Cavern Answers",
    subtitle: "The sea's own stars",
    body: "As the last light joins, every crystal in the cavern blooms at once — a constellation the sea has kept lit for itself since before ships had names. You are the first to read it back. The chart takes another fragment.",
  },
};

export default function DiscoveryOverlay() {
  const overlay = useVoyage((s) => s.overlay);
  const setOverlay = useVoyage((s) => s.setOverlay);

  const poi = overlay ? getPoi(overlay) : undefined;
  const card: EventCard | undefined = poi
    ? {
        kicker: poi.fragment ? "Discovery · chart fragment found" : "Discovery",
        title: poi.title,
        subtitle: poi.subtitle,
        epigraph: poi.epigraph,
        epigraphSource: poi.epigraphSource,
        body: poi.story,
      }
    : overlay
      ? EVENT_CARDS[overlay]
      : undefined;

  return (
    <AnimatePresence>
      {card && (
        <motion.section
          key={overlay}
          aria-live="polite"
          className="fixed bottom-24 left-6 right-6 sm:left-12 sm:right-auto sm:max-w-md z-30"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1.1, ease: "easeOut" } }}
          exit={{ opacity: 0, y: -12, transition: { duration: 0.4 } }}
        >
          <div className="panel rounded-lg p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-epic text-gold mb-2">
              {card.kicker}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-light text-ink">
              {card.title}
            </h2>
            <p className="font-display italic text-ink-dim mt-1">{card.subtitle}</p>

            <div className="rule-gold my-4" />

            {card.epigraph && (
              <blockquote className="font-display italic text-base sm:text-lg text-ink/90 leading-relaxed mb-4">
                “{card.epigraph}”
                <footer className="not-italic text-xs text-ink-dim mt-2">
                  — {card.epigraphSource}
                </footer>
              </blockquote>
            )}

            <p className="text-sm text-ink-dim leading-relaxed">{card.body}</p>

            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="mt-5 px-5 py-2 text-xs uppercase tracking-widest text-gold-bright border border-gold/30 rounded-full hover:bg-gold/10 transition-colors cursor-pointer"
            >
              Sail on
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
