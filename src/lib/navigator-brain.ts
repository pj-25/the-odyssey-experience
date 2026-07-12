/**
 * The Navigator — a scripted, spoiler-free companion, now a living guide.
 *
 * Runs entirely client-side: keyword-scored retrieval over a hand-written
 * knowledge base, plus a context layer that knows where the ship is, what
 * has been discovered, and what the stars are pointing at — so hints,
 * greetings, and stories adapt to each visitor's journey. Designed to be
 * swapped for a real LLM endpoint later without changing the UI.
 */

import { POIS, FRAGMENT_COUNT, type Poi } from "./world";
import { constellationForPoi } from "./constellations";
import { compassLabel, bearingTo, distance2D } from "./sailing";

/** What the Navigator can see of the world when replying. */
export interface NavigatorContext {
  shipX: number;
  shipZ: number;
  discoveredIds: string[];
  fragments: number;
  stormNearby: boolean;
  beaconLit: boolean;
}

export interface NavigatorTopic {
  id: string;
  /** Lowercase keywords that pull this topic up */
  keywords: string[];
  reply: string;
}

const TOPICS: NavigatorTopic[] = [
  {
    id: "homer",
    keywords: ["homer", "poet", "author", "wrote", "who", "blind", "greek"],
    reply:
      "Homer is the name antiquity gave to the poet — or poets — behind the Iliad and the Odyssey, composed around the 8th century BCE. The poems were sung aloud for generations before they were ever written down, which is why the sea in them still sounds like a voice. Whether Homer was one person or many, the tradition agrees on this: the Odyssey was always meant to be shared with a crowd.",
  },
  {
    id: "odyssey-story",
    keywords: ["story", "plot", "about", "odysseus", "epic", "poem", "summary"],
    reply:
      "The Odyssey follows Odysseus, king of Ithaca, on his ten-year voyage home after the Trojan War — past monsters, temptations, and gods, toward a wife and son who never stopped waiting. But it's really a poem about what home costs, and what the journey makes of us. I'll keep the film's own telling unspoiled — some seas you should cross for the first time in the dark of a theatre.",
  },
  {
    id: "themes",
    keywords: [
      "theme", "meaning", "homecoming", "home", "journey", "courage",
      "sacrifice", "friendship", "curiosity", "unknown", "nostos",
    ],
    reply:
      "The Greeks had a word for it: nostos — the homecoming that gives the whole journey its meaning (it's the root of 'nostalgia', the ache for return). The Odyssey braids that ache with curiosity, courage, loyalty, and the price of each. A question worth carrying into the film: is the journey the obstacle to home, or the thing that makes home worth reaching?",
  },
  {
    id: "sirens",
    keywords: ["siren", "monster", "cyclops", "temptation", "creature"],
    reply:
      "The famous trials — the Cyclops, the Sirens, Scylla and Charybdis — endure because each is a mirror. The Sirens don't threaten the body; they sing to you about yourself. Odysseus asks to hear them tied to the mast: he wants the knowledge without being destroyed by it. Curiosity, held by discipline. Watch for that tension everywhere in the story.",
  },
  {
    id: "nolan-style",
    keywords: [
      "nolan", "director", "filmmaking", "style", "imax", "film", "camera",
      "practical", "70mm", "shot",
    ],
    reply:
      "Christopher Nolan shoots for the biggest canvas there is — IMAX film, practical effects, real places over green screens — and he builds stories the way engineers build bridges: structure first, spectacle in service of it. Time is his lifelong subject, and the Odyssey is one of the oldest stories ever told about time — twenty years, one homecoming. It's hard to imagine a better match of teller and tale.",
  },
  {
    id: "history",
    keywords: [
      "history", "old", "ancient", "translation", "influence", "culture",
      "years", "written", "oral",
    ],
    reply:
      "The Odyssey is roughly 2,800 years old and has never been out of circulation — recited by bards, copied by monks, translated into hundreds of languages, retold as Ulysses, as O Brother Where Art Thou, as countless voyages home. Every generation gets its own Odyssey. This film is ours, and you get to be there the week it arrives.",
  },
  {
    id: "spoilers",
    keywords: ["spoiler", "reveal", "ending", "happens", "cast", "scene", "trailer"],
    reply:
      "I keep no spoilers aboard this ship — the horizon stays unbroken until you see the film yourself. What I can offer is the map beneath the story: the poem, its themes, and the craft of the director. Ask me about those, and arrive at the theatre curious rather than certain.",
  },
  {
    id: "watch-party",
    keywords: ["watch", "ticket", "premiere", "release", "when", "date", "theater", "theatre", "cinema"],
    reply:
      "The film reaches theatres on July 17, 2026 — the countdown above the horizon is ticking toward it. My counsel: see it large, see it loud, and see it with people. Then come back here, add your light to the map, and tell the voyage log where you watched it. The story isn't finished until it's shared.",
  },
  {
    id: "prompt-request",
    keywords: ["talk", "discuss", "question", "prompt", "conversation", "friend", "think"],
    reply:
      "Here are three questions to carry with you, for the conversation after the credits: (1) Which trial in the story is really about something you've faced yourself? (2) Is Odysseus the same man who left — and would you want to be? (3) What is your Ithaca — the thing you'd cross any sea to return to? Argue about them over a late meal. That's how this story has always been told.",
  },
  {
    id: "this-place",
    keywords: ["this", "site", "experience", "ship", "here", "voyage", "help", "navigate"],
    reply:
      "You're at the helm of a ship on an open night sea, and everything on the horizon is real: cliffs you can sail between, a temple that remembers, a cave that glows, a fire that waits, a city under the water — and one that only a finished chart reveals. Steer with A/D, trim with W/S, consult the stars with C, act with E. The journal (bottom of your view) keeps your chart; the sea keeps everything else.",
  },
];

const GREETINGS = [
  "hello", "hi", "hey", "greetings", "yo", "hail",
];

export const NAVIGATOR_INTRO =
  "Well met, traveller. I am the Navigator — keeper of this ship's charts and of the old story it sails on. The helm is yours: sail where you will, and ask me for a heading when the sea feels too wide. Ask me too about Homer's epic, its themes, or the craft of Christopher Nolan. I carry no spoilers, only stars.";

export const SUGGESTED_QUESTIONS = [
  "Where should I sail?",
  "How do the stars guide me?",
  "Who was Homer?",
  "What have I discovered so far?",
  "Give me questions to discuss after the film",
];

const FALLBACK =
  "The sea keeps some questions for itself — that one is beyond my charts. Ask me where to sail, what the stars mean, or about Homer, the epic's themes, and Christopher Nolan's craft. Or say 'give me conversation prompts' and I'll arm you for the talk after the credits.";

/** Score a topic against the user's message: count of keyword hits. */
function scoreTopic(message: string, topic: NavigatorTopic): number {
  let score = 0;
  for (const kw of topic.keywords) {
    if (message.includes(kw)) score += kw.length > 4 ? 2 : 1;
  }
  return score;
}

function includesAny(message: string, words: string[]): boolean {
  return words.some((w) => message.includes(w));
}

/** Nearest place not yet discovered (hidden city only once chart is full). */
export function nearestSecret(ctx: NavigatorContext): Poi | undefined {
  const candidates = POIS.filter(
    (p) =>
      !ctx.discoveredIds.includes(p.id) &&
      p.id !== "harbor" &&
      (!p.hidden || ctx.fragments >= FRAGMENT_COUNT),
  );
  let best: Poi | undefined;
  let bestD = Infinity;
  for (const p of candidates) {
    const d = distance2D(ctx.shipX, ctx.shipZ, p.x, p.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** A sailing hint toward the nearest secret, phrased by the Navigator. */
export function hintReply(ctx: NavigatorContext): string {
  const target = nearestSecret(ctx);
  if (!target) {
    return "Your chart holds no more blank spaces, traveller — every secret I know of, you have seen. Sail home to the golden city, or simply sail: some journeys need no destination.";
  }
  const dir = compassLabel(
    bearingTo(ctx.shipX, ctx.shipZ, target.x, target.z),
  );
  const c = constellationForPoi(target.id);
  const starLine = c
    ? ` Consult the stars (press C) and ${c.name} will burn brighter on that bearing — ${c.lore.toLowerCase()}`
    : "";
  return `${target.hint} Steer ${dir} from where you ride now.${starLine}`;
}

/** A recap of the visitor's journey so far. */
export function journeyReply(ctx: NavigatorContext): string {
  if (ctx.discoveredIds.length === 0) {
    return "Your log is still blank — every horizon is a first horizon. Raise the sails and pick a star; I'll keep the record as you go.";
  }
  const names = ctx.discoveredIds
    .map((id) => POIS.find((p) => p.id === id)?.title)
    .filter(Boolean)
    .join(", ");
  const frag =
    ctx.fragments >= FRAGMENT_COUNT
      ? "The chart is whole — the Crown constellation now marks a harbour that exists for you alone. Sail north."
      : `You hold ${ctx.fragments} of ${FRAGMENT_COUNT} chart fragments; the rest are still out there in the dark.`;
  return `Your log so far: ${names}. ${frag}`;
}

const STAR_HELP =
  "Press C and look up: the constellations are not decoration, they are a compass. The one burning brightest points along the bearing of the nearest place you have not yet found. Each secret keeps its own sign — Gates, Watcher, Lantern, Flame, Amphora — and when your chart is whole, a sixth appears.";

const SAIL_HELP =
  "Steer with A and D (or the arrow keys); W and S trim your speed to the wind. Space furls or raises the sails. A square rig loves the wind astern — watch the compass rose, the gold needle is the wind. Press C to navigate by the stars, E to act when the world offers something: dive, light, listen.";

/**
 * Produce the Navigator's reply. Pure and testable; pass context to let
 * the guide see the visitor's journey — omit it for the knowledge base only.
 */
export function navigatorReply(
  rawMessage: string,
  ctx?: NavigatorContext,
): string {
  const message = rawMessage.toLowerCase().trim();
  if (!message) return FALLBACK;

  if (GREETINGS.some((g) => message === g || message.startsWith(g + " ") || message.startsWith(g + ","))) {
    return NAVIGATOR_INTRO;
  }

  // Context-aware counsel comes first: the guide over the encyclopaedia
  if (ctx) {
    if (
      includesAny(message, [
        "where should i", "where to", "heading", "hint", "lost",
        "what's next", "whats next", "where now", "sail next", "find next",
        "which way", "where should", "guide me",
      ])
    ) {
      return hintReply(ctx);
    }
    if (
      includesAny(message, [
        "discovered", "found so far", "my journey", "progress", "fragments",
        "chart", "my log", "so far",
      ])
    ) {
      return journeyReply(ctx);
    }
    if (includesAny(message, ["constellation", "stars guide", "star", "navigate by"])) {
      return STAR_HELP;
    }
    if (includesAny(message, ["control", "steer", "helm", "sail ", "sails", "how do i", "keys", "move"])) {
      return SAIL_HELP;
    }
    if (includesAny(message, ["storm", "trials", "lightning", "thunder"])) {
      return ctx.stormNearby
        ? "You feel it too, then — the air going heavy, the swell finding its teeth. The storm to the south-west is one of the old trials: it cannot be avoided by the brave, only endured. Furl nothing. Sail through, and you will be someone slightly different on the far side."
        : "Far to the south-west the sky sits lower than it should. That is the storm the old charts mark with a single word: trials. Sail toward it when you are ready to be tested — the sea keeps a fragment of the chart inside it, or at least the sailor you become does.";
    }
    if (includesAny(message, ["beacon", "fire", "tower", "watchfire"])) {
      return ctx.beaconLit
        ? "The watchfire burns because you lit it — and somewhere over the horizon, other travellers' fires are answering. Look north on a clear night; the sky itself has taken up the signal."
        : "East of the home shore a tower has waited three thousand years without a flame. Fires like that were never meant for one keeper. Sail to it and press E — light it, and see what answers.";
    }
  }

  let best: NavigatorTopic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const s = scoreTopic(message, topic);
    if (s > bestScore) {
      best = topic;
      bestScore = s;
    }
  }
  return best && bestScore >= 1 ? best.reply : FALLBACK;
}
