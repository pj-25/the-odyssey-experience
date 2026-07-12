# The Odyssey Experience

*A voyage before the film.*

An immersive 3D web experience celebrating Christopher Nolan's **The
Odyssey** (in theatres July 17, 2026). Visitors board an ancient ship on a
cinematic night sea and drift through five chapters inspired by the epic's
timeless themes — the journey, curiosity, courage, homecoming, and
community — then leave their mark alongside travellers from around the
world.

Not a movie website. A once-in-a-generation cultural event, shared.

## What's aboard

- 🌊 **A living sea** — custom shader ocean, procedural ancient galley
  riding the exact same wave field, seeded starfield, glowing moon,
  drifting mist. Weather is narrative: the storm *arrives* in The Trials.
- 📖 **Five chapters** — camera voyages between moods, each with a
  public-domain Homer epigraph, a reflection, and a question to carry.
- ⏳ **Global premiere countdown** — one clock, every visitor under it.
- 🕯️ **Voyage Log** — reflections left before and after watching the film.
- 🗺️ **Travellers' Map** — a hand-sketched chart; click to light your harbour.
- 🧭 **The Navigator** — a spoiler-free companion for conversation about
  Homer's epic, its history, and Nolan's craft.
- 🏛️ **Personal journey & achievements** — your timeline of shores reached,
  remembered between visits.
- 🎼 **Generative ambience** — ocean and orchestral drone synthesized live
  in WebAudio. Zero audio files.

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
