"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  navigatorReply,
  NAVIGATOR_INTRO,
  SUGGESTED_QUESTIONS,
  type NavigatorContext,
} from "@/lib/navigator-brain";
import { stormIntensityAt } from "@/lib/world";
import {
  useVoyage,
  useMemoryBoard,
  useExploration,
  fragmentsOf,
  shipPose,
} from "@/lib/store";

/** Snapshot of the visitor's journey, taken at the moment of asking. */
function buildContext(): NavigatorContext {
  const exploration = useExploration.getState();
  return {
    shipX: shipPose.x,
    shipZ: shipPose.z,
    discoveredIds: exploration.discoveries.map((d) => d.poiId),
    fragments: fragmentsOf(exploration.discoveries),
    stormNearby: stormIntensityAt(shipPose.x, shipPose.z) > 0.08,
    beaconLit: exploration.beaconLit,
  };
}

interface Message {
  role: "navigator" | "visitor";
  text: string;
}

/**
 * The Navigator: a compass rose in the corner that opens into a
 * spoiler-free conversation about the epic, its themes, and the film's maker.
 */
export default function Navigator() {
  const embarked = useVoyage((s) => s.embarked);
  const open = useVoyage((s) => s.navigatorOpen);
  const setOpen = useVoyage((s) => s.setNavigatorOpen);
  const unlock = useMemoryBoard((s) => s.unlock);

  const [messages, setMessages] = useState<Message[]>([
    { role: "navigator", text: NAVIGATOR_INTRO },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  if (!embarked) return null;

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((m) => [...m, { role: "visitor", text: trimmed }]);
    setInput("");
    setThinking(true);
    unlock("spoke-to-navigator");
    // A beat of "consulting the charts" keeps the exchange feeling alive
    const delay = 600 + (trimmed.length % 8) * 90;
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: "navigator", text: navigatorReply(trimmed, buildContext()) },
      ]);
      setThinking(false);
    }, delay);
  };

  return (
    <>
      {/* Compass toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close the Navigator" : "Speak with the Navigator"}
        aria-expanded={open}
        className="fixed top-6 right-6 z-40 w-12 h-12 rounded-full panel flex items-center justify-center text-gold-bright hover:border-gold transition-colors cursor-pointer"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 1.6, duration: 0.8 } }}
        whileHover={{ rotate: 20 }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
          <path d="M14.5 9.5L12 12l-3.5 3.5L11 12z" fill="currentColor" stroke="none" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            className="fixed z-40 panel flex flex-col inset-x-0 bottom-0 h-[72dvh] rounded-t-2xl sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-6 sm:h-auto sm:w-96 sm:rounded-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            role="complementary"
            aria-label="Navigator conversation"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 40, transition: { duration: 0.3 } }}
          >
            <header className="px-5 pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-epic text-gold">Ship&apos;s counsel</p>
              <h2 className="font-display text-2xl font-light text-ink">The Navigator</h2>
            </header>
            <div className="rule-gold" />

            <div ref={scrollRef} className="scroll-quiet flex-1 px-5 py-4 space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "visitor" ? "flex justify-end" : "flex justify-start"}
                >
                  <p
                    className={`max-w-[85%] text-sm leading-relaxed rounded-lg px-3.5 py-2.5 ${
                      m.role === "visitor"
                        ? "bg-gold/15 text-ink border border-gold/20"
                        : "bg-abyss/60 text-ink/90 font-display text-[15px]"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              ))}
              {thinking && (
                <p className="text-xs italic text-ink-dim" role="status">
                  The Navigator consults the stars…
                </p>
              )}
            </div>

            {messages.length <= 2 && (
              <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="text-[11px] text-ink-dim border border-ink-dim/25 rounded-full px-3 py-1 hover:text-gold-bright hover:border-gold/40 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-4 pt-2 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the epic, its themes, the craft…"
                aria-label="Message the Navigator"
                maxLength={300}
                className="flex-1 bg-abyss/60 border border-gold/20 rounded-full px-4 py-2 text-sm placeholder:text-ink-dim/50"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                aria-label="Send"
                className="w-9 h-9 rounded-full bg-gold-bright text-abyss disabled:opacity-30 hover:bg-gold transition-colors cursor-pointer"
              >
                ↑
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
