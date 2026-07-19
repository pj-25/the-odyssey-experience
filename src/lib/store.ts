"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FRAGMENT_COUNT, POIS } from "./world";

/* ------------------------------------------------------------------ */
/* Session state (ephemeral)                                           */
/* ------------------------------------------------------------------ */

export type WorldMode = "sailing" | "cinematic" | "underwater";

interface VoyageState {
  /** Has the visitor pressed "Begin the Voyage" yet */
  embarked: boolean;
  audioEnabled: boolean;
  navigatorOpen: boolean;
  journalOpen: boolean;
  /** What currently owns the camera */
  mode: WorldMode;
  /** Sails raised (drawing wind) or furled */
  sailsUp: boolean;
  /** Star navigation view active (C) */
  consultingStars: boolean;
  /** Discovery overlay currently shown (poi id or event id) */
  overlay: string | null;
  /** Open puzzle panel */
  puzzle: "temple" | "cave" | null;
  embark: () => void;
  toggleAudio: () => void;
  setNavigatorOpen: (open: boolean) => void;
  setJournalOpen: (open: boolean) => void;
  setMode: (mode: WorldMode) => void;
  setSailsUp: (up: boolean) => void;
  setConsultingStars: (on: boolean) => void;
  setOverlay: (id: string | null) => void;
  setPuzzle: (p: "temple" | "cave" | null) => void;
}

export const useVoyage = create<VoyageState>((set) => ({
  embarked: false,
  audioEnabled: false,
  navigatorOpen: false,
  journalOpen: false,
  mode: "sailing",
  sailsUp: true,
  consultingStars: false,
  overlay: null,
  puzzle: null,
  embark: () => {
    set({ embarked: true });
    useMemoryBoard.getState().unlock("embarked");
  },
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setNavigatorOpen: (navigatorOpen) => set({ navigatorOpen }),
  setJournalOpen: (journalOpen) => set({ journalOpen }),
  setMode: (mode) => set({ mode }),
  setSailsUp: (sailsUp) => set({ sailsUp }),
  setConsultingStars: (consultingStars) => set({ consultingStars }),
  setOverlay: (overlay) => set({ overlay }),
  setPuzzle: (puzzle) => set({ puzzle }),
}));

/**
 * Per-frame ship pose, shared outside React so the HUD can sample it
 * without causing re-renders on the 60 fps path.
 */
export const shipPose = {
  x: 0,
  z: 20,
  heading: 0,
  speed: 0,
  windDirection: 0,
  windStrength: 0.8,
  /** Sailing heel (roll), radians — rudder + crosswind pressure */
  lean: 0,
};

/* ------------------------------------------------------------------ */
/* Exploration progress (persisted)                                    */
/* ------------------------------------------------------------------ */

export interface Discovery {
  poiId: string;
  at: string;
}

interface ExplorationState {
  discoveries: Discovery[];
  templeSolved: boolean;
  caveSolved: boolean;
  beaconLit: boolean;
  artifactFound: boolean;
  stormBraved: boolean;
  homecomingDone: boolean;
  discover: (poiId: string) => boolean;
  hasDiscovered: (poiId: string) => boolean;
  solveTemple: () => void;
  solveCave: () => void;
  lightBeacon: () => void;
  findArtifact: () => void;
  braveStorm: () => void;
  completeHomecoming: () => void;
}

export const useExploration = create<ExplorationState>()(
  persist(
    (set, get) => ({
      discoveries: [],
      templeSolved: false,
      caveSolved: false,
      beaconLit: false,
      artifactFound: false,
      stormBraved: false,
      homecomingDone: false,
      discover: (poiId) => {
        if (get().discoveries.some((d) => d.poiId === poiId)) return false;
        set((s) => ({
          discoveries: [...s.discoveries, { poiId, at: new Date().toISOString() }],
        }));
        const unlock = useMemoryBoard.getState().unlock;
        unlock("first-discovery");
        if (fragmentsOf(get().discoveries) >= FRAGMENT_COUNT) {
          unlock("chart-complete");
        }
        return true;
      },
      hasDiscovered: (poiId) =>
        get().discoveries.some((d) => d.poiId === poiId),
      solveTemple: () => {
        set({ templeSolved: true });
        useMemoryBoard.getState().unlock("temple-waker");
      },
      solveCave: () => {
        set({ caveSolved: true });
        useMemoryBoard.getState().unlock("cave-listener");
      },
      lightBeacon: () => {
        set({ beaconLit: true });
        useMemoryBoard.getState().unlock("beacon-keeper");
      },
      findArtifact: () => {
        set({ artifactFound: true });
        useMemoryBoard.getState().unlock("deep-diver");
      },
      braveStorm: () => {
        set({ stormBraved: true });
        useMemoryBoard.getState().unlock("storm-rider");
      },
      completeHomecoming: () => {
        set({ homecomingDone: true });
        useMemoryBoard.getState().unlock("homecoming");
      },
    }),
    { name: "odyssey-exploration" },
  ),
);

/** Map fragments held, given a discovery list. */
export function fragmentsOf(discoveries: Discovery[]): number {
  return discoveries.filter((d) => POIS.find((p) => p.id === d.poiId)?.fragment)
    .length;
}

/* ------------------------------------------------------------------ */
/* Community memory (persisted)                                        */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  id: string;
  name: string;
  location: string;
  text: string;
  phase: "before" | "after";
  /** ISO timestamp */
  at: string;
  /** Whether this entry was written by this visitor (vs. seeded) */
  mine?: boolean;
}

export interface MapLight {
  id: string;
  /** Percent coordinates on the map SVG viewBox */
  x: number;
  y: number;
  label: string;
  mine?: boolean;
}

export type AchievementId =
  | "embarked"
  | "first-discovery"
  | "storm-rider"
  | "temple-waker"
  | "cave-listener"
  | "beacon-keeper"
  | "deep-diver"
  | "chart-complete"
  | "homecoming"
  | "log-entry"
  | "map-light"
  | "spoke-to-navigator";

interface MemoryState {
  logEntries: LogEntry[];
  mapLights: MapLight[];
  achievements: AchievementId[];
  addLogEntry: (entry: Omit<LogEntry, "id" | "at" | "mine">) => void;
  addMapLight: (light: Omit<MapLight, "id" | "mine">) => void;
  unlock: (id: AchievementId) => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Seeded community so the world never feels empty before the backend lands. */
export const SEED_LOG: LogEntry[] = [
  {
    id: "seed-1",
    name: "Eleni",
    location: "Athens, Greece",
    text: "My grandfather read me the Odyssey on the ferry to Ithaca. I'll be thinking of him in the theatre.",
    phase: "before",
    at: "2026-07-02T19:24:00Z",
  },
  {
    id: "seed-2",
    name: "Marcus",
    location: "Chicago, USA",
    text: "Booked the 70mm IMAX show the minute tickets opened. Five days feels longer than ten years at sea.",
    phase: "before",
    at: "2026-07-06T02:11:00Z",
  },
  {
    id: "seed-3",
    name: "Yuki",
    location: "Osaka, Japan",
    text: "We are watching as a family — three generations, one story.",
    phase: "before",
    at: "2026-07-09T11:47:00Z",
  },
  {
    id: "seed-4",
    name: "Amara",
    location: "Lagos, Nigeria",
    text: "The sea in this trailer looked like something I've only seen in dreams.",
    phase: "before",
    at: "2026-07-10T21:03:00Z",
  },
];

export const SEED_LIGHTS: MapLight[] = [
  { id: "sl-1", x: 51.5, y: 38.5, label: "Athens" },
  { id: "sl-2", x: 23.5, y: 33, label: "Chicago" },
  { id: "sl-3", x: 82, y: 39, label: "Osaka" },
  { id: "sl-4", x: 47.5, y: 55, label: "Lagos" },
  { id: "sl-5", x: 45.5, y: 28.5, label: "London" },
  { id: "sl-6", x: 30.5, y: 68, label: "São Paulo" },
  { id: "sl-7", x: 70, y: 44, label: "Mumbai" },
  { id: "sl-8", x: 87.5, y: 71, label: "Sydney" },
];

export const useMemoryBoard = create<MemoryState>()(
  persist(
    (set, get) => ({
      logEntries: SEED_LOG,
      mapLights: SEED_LIGHTS,
      achievements: [],
      addLogEntry: (entry) => {
        set((s) => ({
          logEntries: [
            { ...entry, id: uid(), at: new Date().toISOString(), mine: true },
            ...s.logEntries,
          ],
        }));
        get().unlock("log-entry");
      },
      addMapLight: (light) => {
        set((s) => ({
          mapLights: [...s.mapLights, { ...light, id: uid(), mine: true }],
        }));
        get().unlock("map-light");
      },
      unlock: (id) =>
        set((s) =>
          s.achievements.includes(id)
            ? s
            : { achievements: [...s.achievements, id] },
        ),
    }),
    { name: "odyssey-voyage-log" },
  ),
);

export const ACHIEVEMENTS: Record<AchievementId, { title: string; blurb: string }> = {
  embarked: { title: "Set Sail", blurb: "Left the harbour and took the helm." },
  "first-discovery": { title: "Far-Wanderer", blurb: "Found your first secret of the sea." },
  "storm-rider": { title: "Storm-Rider", blurb: "Sailed into the Trials and out the other side." },
  "temple-waker": { title: "Waker of Stone", blurb: "Read the glyphs and woke the Watcher." },
  "cave-listener": { title: "Keeper of the Lantern", blurb: "Joined the stars on the cavern ceiling." },
  "beacon-keeper": { title: "Beacon-Keeper", blurb: "Answered a three-thousand-year-old fire." },
  "deep-diver": { title: "Deep-Diver", blurb: "Brought a memory back from the sunken city." },
  "chart-complete": { title: "Cartographer", blurb: "Assembled all five fragments of the old chart." },
  homecoming: { title: "Nostos", blurb: "Reached the city beyond the fog." },
  "log-entry": { title: "Voice on the Water", blurb: "Left a reflection in the Voyage Log." },
  "map-light": { title: "Light on the Map", blurb: "Marked your harbour for other travellers." },
  "spoke-to-navigator": { title: "Counsel of the Navigator", blurb: "Sought the Navigator's wisdom." },
};
