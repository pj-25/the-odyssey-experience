"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { POIS, FRAGMENT_COUNT } from "@/lib/world";
import {
  useVoyage,
  useExploration,
  useMemoryBoard,
  fragmentsOf,
  ACHIEVEMENTS,
  type LogEntry,
} from "@/lib/store";
import Countdown from "./Countdown";
import WorldMap from "./WorldMap";

type Tab = "chart" | "log" | "map" | "honours";

const TABS: Array<[Tab, string]> = [
  ["chart", "The Chart"],
  ["log", "Voyage Log"],
  ["map", "Travellers' Map"],
  ["honours", "Honours"],
];

/** The captain's journal: your chart, the community's words and lights. */
export default function Journal() {
  const open = useVoyage((s) => s.journalOpen);
  const setOpen = useVoyage((s) => s.setJournalOpen);
  const [tab, setTab] = useState<Tab>("chart");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Captain's journal"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-abyss/70 backdrop-blur-sm cursor-default"
          />
          <motion.div
            className="panel relative rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 20, transition: { duration: 0.25 } }}
          >
            <header className="flex items-center justify-between px-6 pt-5 pb-4">
              <nav className="flex gap-1 flex-wrap" aria-label="Journal sections">
                {TABS.map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    aria-current={tab === t ? "page" : undefined}
                    className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full transition-colors cursor-pointer ${
                      tab === t
                        ? "text-abyss bg-gold-bright"
                        : "text-ink-dim hover:text-gold-bright"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close journal"
                className="text-ink-dim hover:text-ink text-xl leading-none px-2 cursor-pointer"
              >
                ×
              </button>
            </header>
            <div className="rule-gold" />

            <div className="scroll-quiet px-6 py-6 flex-1">
              {tab === "chart" && <ChartTab />}
              {tab === "log" && <VoyageLog />}
              {tab === "map" && <WorldMap />}
              {tab === "honours" && <Honours />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* The Chart: discoveries plotted as they're found                      */
/* ------------------------------------------------------------------ */

/** World → chart coordinates (world spans roughly x −320..320, z −520..120). */
function chartXY(x: number, z: number): { cx: number; cy: number } {
  return {
    cx: 50 + (x / 680) * 100,
    cy: 76 + (z / 680) * 100,
  };
}

function ChartTab() {
  const discoveries = useExploration((s) => s.discoveries);
  const fragments = fragmentsOf(discoveries);
  const complete = fragments >= FRAGMENT_COUNT;
  const discovered = new Set(discoveries.map((d) => d.poiId));

  return (
    <div>
      <p className="text-sm text-ink-dim mb-1">
        {complete
          ? "The chart is whole. A harbour that no unfinished map can see now waits due north."
          : `${fragments} of ${FRAGMENT_COUNT} fragments recovered. The rest are still out in the dark — the stars know where.`}
      </p>
      <div className="my-4">
        <Countdown compact />
      </div>

      <svg
        viewBox="0 0 100 90"
        role="img"
        aria-label="Chart of your discoveries"
        className="w-full rounded-lg border border-gold/20 bg-abyss/50"
      >
        {/* Graticule */}
        {[18, 36, 54, 72].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(151,163,189,0.07)" strokeWidth="0.2" />
        ))}
        {[25, 50, 75].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="90" stroke="rgba(151,163,189,0.07)" strokeWidth="0.2" />
        ))}
        <text x="50" y="86" textAnchor="middle" fill="rgba(151,163,189,0.5)" fontSize="3" fontFamily="serif" fontStyle="italic">
          — the home shore —
        </text>

        {POIS.map((poi) => {
          const seen = discovered.has(poi.id);
          if (poi.hidden && !complete && !seen) return null;
          const { cx, cy } = chartXY(poi.x, poi.z);
          return (
            <g key={poi.id}>
              {seen ? (
                <>
                  <circle cx={cx} cy={cy} r="1.4" fill="#e8cf9e" />
                  <circle cx={cx} cy={cy} r="2.6" fill="none" stroke="#c9a86a" strokeWidth="0.2" opacity="0.5" />
                  <text x={cx} y={cy - 3.4} textAnchor="middle" fill="#e8cf9e" fontSize="3.2" fontFamily="serif">
                    {poi.title}
                  </text>
                </>
              ) : (
                <text x={cx} y={cy} textAnchor="middle" fill="rgba(151,163,189,0.4)" fontSize="4" fontFamily="serif">
                  ?
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <ol className="mt-5 space-y-3" aria-label="Discoveries">
        {discoveries.length === 0 && (
          <li className="text-sm text-ink-dim italic font-display">
            Nothing yet — the blank chart is the invitation. Press C at the helm and follow what burns.
          </li>
        )}
        {discoveries.map((d) => {
          const poi = POIS.find((p) => p.id === d.poiId);
          if (!poi) return null;
          return (
            <li key={d.poiId} className="border-l-2 border-gold/25 pl-4">
              <p className="font-display text-lg text-ink">
                {poi.title}
                {poi.fragment && <span className="text-gold text-sm ml-2">✦ fragment</span>}
              </p>
              <p className="text-xs text-ink-dim">
                {new Date(d.at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Voyage Log (community reflections)                                   */
/* ------------------------------------------------------------------ */

function VoyageLog() {
  const entries = useMemoryBoard((s) => s.logEntries);
  const addLogEntry = useMemoryBoard((s) => s.addLogEntry);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"before" | "after">("before");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addLogEntry({
      name: name.trim() || "A traveller",
      location: location.trim() || "Somewhere at sea",
      text: text.trim(),
      phase,
    });
    setText("");
  };

  return (
    <div>
      <p className="text-sm text-ink-dim mb-4">
        Reflections left by travellers before and after watching the film.
      </p>

      <form onSubmit={submit} className="mb-6 space-y-3">
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            aria-label="Your name"
            className="flex-1 bg-abyss/60 border border-gold/20 rounded px-3 py-2 text-sm placeholder:text-ink-dim/50"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where in the world?"
            maxLength={60}
            aria-label="Your location"
            className="flex-1 bg-abyss/60 border border-gold/20 rounded px-3 py-2 text-sm placeholder:text-ink-dim/50"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            phase === "before"
              ? "What are you hoping to feel in that theatre?"
              : "Where did you watch it — and what stayed with you?"
          }
          maxLength={400}
          rows={3}
          aria-label="Your reflection"
          className="w-full bg-abyss/60 border border-gold/20 rounded px-3 py-2 text-sm placeholder:text-ink-dim/50 resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2" role="radiogroup" aria-label="Before or after watching">
            {(["before", "after"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={phase === p}
                onClick={() => setPhase(p)}
                className={`px-3 py-1 text-[11px] uppercase tracking-widest rounded-full border transition-colors cursor-pointer ${
                  phase === p
                    ? "border-gold text-gold-bright bg-gold/10"
                    : "border-ink-dim/30 text-ink-dim"
                }`}
              >
                {p === "before" ? "Before watching" : "After watching"}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="px-5 py-1.5 text-xs uppercase tracking-widest text-abyss bg-gold-bright rounded-full hover:bg-gold transition-colors cursor-pointer"
          >
            Cast adrift
          </button>
        </div>
      </form>

      <ol className="space-y-4" aria-label="Voyage log entries">
        {entries.map((entry) => (
          <LogCard key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  );
}

function LogCard({ entry }: { entry: LogEntry }) {
  return (
    <li
      className={`border-l-2 pl-4 py-1 ${
        entry.mine ? "border-gold-bright" : "border-gold/25"
      }`}
    >
      <p className="font-display italic text-ink/90 leading-relaxed">“{entry.text}”</p>
      <p className="text-xs text-ink-dim mt-1.5">
        <span className="text-gold-bright/90">{entry.name}</span> · {entry.location} ·{" "}
        <span className="uppercase tracking-widest text-[10px]">
          {entry.phase === "before" ? "before the voyage" : "after the credits"}
        </span>
        {entry.mine && <span className="ml-2 text-gold">— you</span>}
      </p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Honours (achievements)                                               */
/* ------------------------------------------------------------------ */

function Honours() {
  const achievements = useMemoryBoard((s) => s.achievements);

  return (
    <div>
      <p className="text-sm text-ink-dim mb-5">
        Marks of the voyage — earned by sailing, not given.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(ACHIEVEMENTS) as Array<keyof typeof ACHIEVEMENTS>).map((id) => {
          const unlocked = achievements.includes(id);
          const a = ACHIEVEMENTS[id];
          return (
            <li
              key={id}
              className={`border rounded-lg px-4 py-3 ${
                unlocked ? "border-gold/40 bg-gold/5" : "border-ink-dim/15 opacity-50"
              }`}
            >
              <p className={`font-display text-base ${unlocked ? "text-gold-bright" : "text-ink-dim"}`}>
                {unlocked ? "✦ " : "· "}
                {a.title}
              </p>
              <p className="text-xs text-ink-dim mt-0.5">{a.blurb}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
