/**
 * The open world: places, their stories, and how the environment reacts
 * to where the visitor sails. Exploration replaces linear chapters —
 * every place carries a fragment of the old voyage's meaning.
 */

/** Global premiere moment (IMAX release). Override with NEXT_PUBLIC_PREMIERE_ISO. */
export const PREMIERE_ISO =
  process.env.NEXT_PUBLIC_PREMIERE_ISO ?? "2026-07-17T00:00:00Z";

export interface EnvPreset {
  waveAmp: number;
  fogDensity: number;
  fogColor: string;
  moonIntensity: number;
  ambientIntensity: number;
  waterColor: string;
  /** Sky/background color */
  skyColor: string;
}

export const ENV_PRESETS = {
  openSea: {
    waveAmp: 1.0,
    fogDensity: 0.009,
    fogColor: "#0a1830",
    moonIntensity: 2.7,
    ambientIntensity: 0.34,
    waterColor: "#071627",
    skyColor: "#050a14",
  },
  harbor: {
    waveAmp: 0.55,
    fogDensity: 0.011,
    fogColor: "#0f1a30",
    moonIntensity: 3.0,
    ambientIntensity: 0.42,
    waterColor: "#0a1a2e",
    skyColor: "#060c17",
  },
  storm: {
    waveAmp: 2.6,
    fogDensity: 0.024,
    fogColor: "#090d14",
    moonIntensity: 0.9,
    ambientIntensity: 0.18,
    waterColor: "#03080e",
    skyColor: "#04060c",
  },
  cave: {
    waveAmp: 0.25,
    fogDensity: 0.028,
    fogColor: "#04141c",
    moonIntensity: 0.4,
    ambientIntensity: 0.3,
    waterColor: "#062028",
    skyColor: "#020a10",
  },
  underwater: {
    waveAmp: 0.6,
    fogDensity: 0.045,
    fogColor: "#062637",
    moonIntensity: 1.2,
    ambientIntensity: 0.5,
    waterColor: "#051e2c",
    skyColor: "#04202e",
  },
  sunrise: {
    waveAmp: 0.5,
    fogDensity: 0.006,
    fogColor: "#3d2f4a",
    moonIntensity: 1.4,
    ambientIntensity: 0.65,
    waterColor: "#12233c",
    skyColor: "#1a1430",
  },
} satisfies Record<string, EnvPreset>;

export type EnvPresetId = keyof typeof ENV_PRESETS;

/* ------------------------------------------------------------------ */
/* Points of interest                                                   */
/* ------------------------------------------------------------------ */

export type PoiKind =
  | "harbor"
  | "cliffs"
  | "temple"
  | "cave"
  | "beacon"
  | "diveSite"
  | "hiddenCity";

export interface Poi {
  id: string;
  kind: PoiKind;
  x: number;
  z: number;
  /** Sailing within this range counts as discovery */
  radius: number;
  title: string;
  subtitle: string;
  /** Short public-domain epigraph (Butler translation) */
  epigraph: string;
  epigraphSource: string;
  /** Story shown on discovery */
  story: string;
  /** What the Navigator says if asked for a hint toward this place */
  hint: string;
  /** Grants a map fragment on discovery */
  fragment: boolean;
  /** Hidden until `revealedBy` condition (fragments complete) */
  hidden?: boolean;
}

export const POIS: Poi[] = [
  {
    id: "harbor",
    kind: "harbor",
    x: 0,
    z: 60,
    radius: 45,
    title: "The Home Shore",
    subtitle: "Where every odyssey begins — and longs to end",
    epigraph:
      "Tell me, O Muse, of that ingenious hero who travelled far and wide.",
    epigraphSource: "Homer, The Odyssey — Book I",
    story:
      "A lamp burns in the harbour window behind you. It will burn until you return. The sea ahead is uncharted — the stars will point the way to what it hides. Sail toward what you cannot see.",
    hint: "Home lies astern — south, where the lamp burns. Return when your chart is whole.",
    fragment: false,
  },
  {
    id: "cliffs",
    kind: "cliffs",
    x: -150,
    z: -90,
    radius: 42,
    title: "The Siren Gates",
    subtitle: "Twin cliffs that sing when the wind is right",
    epigraph:
      "First you will come to the Sirens who enchant all who come near them.",
    epigraphSource: "Homer, The Odyssey — Book XII",
    story:
      "The passage between the cliffs is narrow, and the wind through it hums like a voice. Sailors say the song asks each traveller a different question. Those who pass beneath and do not turn back earn a fragment of the old chart.",
    hint: "West and north of home, two shadows stand against the stars — sail the gap between them, and do not turn back.",
    fragment: true,
  },
  {
    id: "temple",
    kind: "temple",
    x: 170,
    z: -130,
    radius: 45,
    title: "The Drowned Temple",
    subtitle: "Columns of a forgotten court",
    epigraph:
      "The gods, in the likeness of strangers from far countries, walk the cities of men.",
    epigraphSource: "Homer, The Odyssey — Book XVII",
    story:
      "Marble columns rise from the shallows, and a colossal watcher sits enthroned among them, eyes closed for three thousand years. Around its base runs a ring of carved glyphs. Perhaps the right order would wake it.",
    hint: "East of home, past the open water, drowned columns catch the moonlight. The statue there sleeps — the glyphs at its feet remember the order of things: dawn, sea, storm, home.",
    fragment: true,
  },
  {
    id: "cave",
    kind: "cave",
    x: -70,
    z: -260,
    radius: 40,
    title: "The Glowing Cave",
    subtitle: "Where the sea keeps its own stars",
    epigraph:
      "A dark cave, through which flows the water of the sea.",
    epigraphSource: "Homer, The Odyssey — Book XIII (the cave of the Nymphs)",
    story:
      "Inside the rock, the water glows from beneath and crystal veins answer from above — a night sky the sea grew for itself. On the cavern ceiling, four lights burn brighter than the rest. They form a shape you have seen before, somewhere overhead.",
    hint: "North-west, far out — a mouth in a mountain of rock, lit faintly from within. The sea grew its own stars in there.",
    fragment: true,
  },
  {
    id: "beacon",
    kind: "beacon",
    x: 210,
    z: 60,
    radius: 42,
    title: "The Watchfire Isle",
    subtitle: "A tower waiting three thousand years for a flame",
    epigraph:
      "There is a time for many words, and there is also a time for sleep.",
    epigraphSource: "Homer, The Odyssey — Book XI",
    story:
      "An unlit watchtower crowns the island. Every traveller who lights it joins a chain of fires reaching back to the age of bronze — and forward to everyone sailing tonight. Light it, and the sky itself may answer.",
    hint: "Due east of home stands a tower with no flame. Fires were meant to be lit — and answered.",
    fragment: true,
  },
  {
    id: "diveSite",
    kind: "diveSite",
    x: 60,
    z: -320,
    radius: 38,
    title: "The Sunken City",
    subtitle: "Rooftops beneath the swell",
    epigraph:
      "As a man may bury a lamp in the ashes to keep the seed of fire alive.",
    epigraphSource: "Homer, The Odyssey — Book V",
    story:
      "Below the ring of worn stone tips, streets still run straight and arches still stand. Something down there glows the colour of a kept promise. Dive, and bring one memory of the drowned world back to the light.",
    hint: "Far north, beyond the cave's latitude, broken stones break the surface in a ring. What they crown lies fathoms down — be ready to dive.",
    fragment: true,
  },
  {
    id: "hiddenCity",
    kind: "hiddenCity",
    x: 0,
    z: -480,
    radius: 55,
    title: "The City Beyond the Fog",
    subtitle: "The place the whole chart was drawn to find",
    epigraph:
      "As the sight of land is welcome to men who are swimming towards the shore.",
    epigraphSource: "Homer, The Odyssey — Book XXIII",
    story:
      "The five fragments align, and the fog gives way: a city of gold-lit terraces rising from the sea at the top of the world, its harbour open, its fires already burning — as though it always knew you were coming. This is what the journey was for: not the leaving, but the arriving, together.",
    hint: "The assembled chart marks a harbour due north of everything, past the sunken city, beyond the fog wall. It will only appear to a finished map.",
    fragment: false,
    hidden: true,
  },
];

export const FRAGMENT_COUNT = POIS.filter((p) => p.fragment).length;

/** Storm region — the Trials live here, discovered by daring it. */
export const STORM = { x: -290, z: -330, radius: 190, id: "storm" };

export function getPoi(id: string): Poi | undefined {
  return POIS.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Environment from position                                           */
/* ------------------------------------------------------------------ */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixPreset(a: EnvPreset, b: EnvPreset, t: number): EnvPreset {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const mixHex = (ha: string, hb: string): string => {
    const pa = parseInt(ha.slice(1), 16);
    const pb = parseInt(hb.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
    const bl = Math.round(lerp(pa & 255, pb & 255, t));
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
  };
  return {
    waveAmp: lerp(a.waveAmp, b.waveAmp, t),
    fogDensity: lerp(a.fogDensity, b.fogDensity, t),
    moonIntensity: lerp(a.moonIntensity, b.moonIntensity, t),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
    fogColor: mixHex(a.fogColor, b.fogColor),
    waterColor: mixHex(a.waterColor, b.waterColor),
    skyColor: mixHex(a.skyColor, b.skyColor),
  };
}

/** 0..1 — how deep inside the storm the position is. */
export function stormIntensityAt(x: number, z: number): number {
  const d = Math.hypot(x - STORM.x, z - STORM.z);
  return smoothstep(STORM.radius, STORM.radius * 0.35, d);
}

/**
 * The world's answer to "where are you?" — blends presets by position.
 * Overrides (cave interior, underwater, sunrise finale) are applied by the
 * scene on top of this.
 */
export function environmentAt(x: number, z: number): EnvPreset {
  let env: EnvPreset = { ...ENV_PRESETS.openSea };

  // Harbour calm
  const harbor = POIS[0];
  const harborT = smoothstep(140, 40, Math.hypot(x - harbor.x, z - harbor.z));
  env = mixPreset(env, ENV_PRESETS.harbor, harborT);

  // Storm — gradual buildup from its outer rim
  const stormT = stormIntensityAt(x, z);
  env = mixPreset(env, ENV_PRESETS.storm, stormT);

  // Cave mouth hush
  const cave = getPoi("cave")!;
  const caveT = smoothstep(90, 25, Math.hypot(x - cave.x, z - cave.z));
  env = mixPreset(env, ENV_PRESETS.cave, caveT * 0.85);

  return env;
}
