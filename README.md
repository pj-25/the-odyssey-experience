# The Odyssey Experience

*A voyage before the film.*

An immersive, freely explorable 3D world celebrating Christopher Nolan's
**The Odyssey** (in theatres July 17, 2026). Take the helm of an ancient
ship on an open night sea: sail by wind and constellation, discover
islands and ruins, brave the storm, dive to a sunken city, and let a
finished chart reveal the city beyond the fog — then leave your mark
alongside travellers from around the world.

Not a movie website. A once-in-a-generation cultural event, shared.

## What's aboard

- ⛵ **Free sailing** — real(ish) square-rig physics: steer, trim, furl;
  the wind wanders and the compass rose tells you where it favours.
- ✨ **Navigate by the stars** — six constellations each point to a
  secret; press C and follow the one that burns.
- 🏝️ **Seven places to discover** — the Siren Gates, a drowned temple
  with a wakeable colossus, a glowing cave, a watchfire that answers with
  the northern lights, a sunken city you can dive into, the storm trial,
  and a finale only a completed chart can see.
- 🧩 **Optional riddles** — a glyph ring and a cavern-star puzzle, solved
  in story, never gated by score.
- 🐬 **A living sea** — dolphins race the bow, gulls wheel over land, a
  whale surfaces in deep water, shooting stars fall, rain and lightning
  live inside the storm. Custom shader ocean; the galley rides the exact
  same wave field.
- ⏳ **Global premiere countdown** — one clock, every visitor under it.
- 🕯️ **Voyage Log & Travellers' Map** — reflections and lights left by
  travellers before and after the film.
- 🧭 **The Navigator** — a spoiler-free companion who knows your journey:
  ask for a heading, your progress, or the lore behind it all.
- 📖 **The Journal** — your chart fills in as you explore; honours are
  earned by sailing.
- 🎼 **Generative ambience** — ocean, drone, thunder, and underwater
  muffling synthesized live in WebAudio. Zero audio files.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm run start   # production
npm test                         # unit tests (vitest)
npm run lint                     # eslint
```

Optional env: `NEXT_PUBLIC_PREMIERE_ISO` overrides the premiere moment
(defaults to `2026-07-17T00:00:00Z`).

## Docs

- `DESIGN.md` — creative vision, storyboard, user journey, IA, 3D world
  design, motion & sound, component architecture, implementation plan,
  performance strategy, roadmap.
- `AGENTS.md` — engineering conventions for contributors (and agents).
- `master-prompt.md` — the original brief.

## Stack

Next.js 16 · React 19 · TypeScript · React Three Fiber / Three.js · GSAP ·
Framer Motion · Tailwind CSS 4 · zustand · vitest.

Accessibility: server-rendered narrative for crawlers and screen readers,
full keyboard navigation, `prefers-reduced-motion` support, `noscript`
fallback.
