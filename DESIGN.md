# The Odyssey Experience — Design Document

*An immersive night-sea voyage celebrating Christopher Nolan's "The Odyssey" (in theatres July 17, 2026).*

---

## 1. Creative Vision

**One sentence:** A single continuous night at sea, crossed together.

The experience is not a website about a film — it is a small, shared ritual
performed before (and after) seeing it. The visitor boards an ancient ship
under a full moon and drifts through five chapters, each meditating on one
of the epic's timeless themes: the journey, curiosity, courage, homecoming,
community. The film itself is never shown, quoted, or spoiled; the
experience works entirely from the 2,800-year-old source and the shared
anticipation of the audience.

**Design principles**

- **The world is the protagonist.** UI is thin, typographic, and parked at
  the edges. Nothing pops, bounces, or begs.
- **Drift, never cut.** Every transition — camera, light, weather, text —
  is a slow tween. The sea never stops moving.
- **Together, visibly.** The countdown, the voyage log, the map of lights:
  every screen carries evidence that thousands of others are on this water.
- **No spoilers, ever.** The Navigator deflects spoiler requests by design;
  all text draws from Homer (public-domain Butler translation) and from
  Nolan's publicly known craft.

**Art direction:** near-black indigo sea (`#050a14`), cold moonlight
(`#b8ccf5`), one warm accent — the ship's lantern and the UI gold
(`#c9a86a`). Typography pairs a light Cormorant Garamond display serif
(titles, epigraphs) with Inter for functional text. Wide-tracked uppercase
labels give the UI its "exhibition placard" voice.

## 2. Storyboard

| Beat | What the visitor sees | Emotional target |
|---|---|---|
| **Arrival** | Black screen → a single gold thread of light ("Raising the sails") → the sea fades in, title tracking-animates open over the water, countdown ticking | Held breath |
| **Embark** | "Begin the Voyage" → hero dissolves, camera eases down toward the ship | Commitment |
| **Ch. 1 — The Departure** | Ship at rest, calm sea, lantern lit; first epigraph fades in | Threshold |
| **Ch. 2 — The Open Sea** | Camera swings wide; moon path glitters to the horizon | Wonder |
| **Ch. 3 — The Trials** | Fog thickens, waves double, moonlight dims to a bruise | Awe / unease |
| **Ch. 4 — The Homecoming** | Storm releases; calmest water, brightest moon, view from beyond the bow looking back | Relief, warmth |
| **Ch. 5 — The Gathering** | High half-orbital view; voyage log, travellers' map, personal timeline open from here | Belonging |
| **Return visits** | State persists: your lights, entries, achievements greet you | Memory |

## 3. User Journey

1. **Discover** (social link, trailer description) → land on the hero: title + countdown in < 3s, world streaming in behind.
2. **Embark** — one deliberate action; audio opt-in offered separately (top-left).
3. **Travel** — next/prev oars, chapter dots, or arrow keys. Each chapter: read the epigraph, sit with the reflection, carry the prompt.
4. **Participate** — at The Gathering: leave a voyage-log reflection (before/after phase), light a harbour on the map, review the personal timeline and community achievements.
5. **Converse** — the Navigator (top-right compass) at any point after embarking.
6. **Return after the film** — switch the log to "after watching," answer "where did you watch it?", see live reactions accumulate.

Personas honoured: the *pilgrim* (reads everything), the *tourist*
(skims chapters, screenshots the sea), the *joiner* (heads straight to the
community features), the *returner* (post-release memory board).

## 4. Information Architecture

Single route (`/`) — the voyage is one continuous space; state, not URLs,
navigates it. (Future: `?chapter=` deep links that replay the drift.)

```
/                         The voyage (all chapters, state-driven)
├── Hero (pre-embark)     Title, countdown, embark CTA
├── Chapters 1–5          Overlay: epigraph / reflection / prompt
├── The Gathering modal   Tabs: Voyage Log · Travellers' Map · My Journey
├── Navigator panel       Slide-in conversation (any time after embark)
└── Persistent chrome     Audio toggle · Navigator toggle · chapter oars
```

State layers:

- **Session (zustand):** embarked, chapter index, travelling flag, audio, panels.
- **Memory (zustand + localStorage):** journey timeline, log entries, map lights, achievements — seeded with curated community content so the world is never empty; swaps to a backend without UI changes (§8).

## 5. 3D World Design

- **Ocean** — 600 m shader plane; vertex displacement = sum of four
  directional sines (`src/lib/waves.ts` is the single source of truth,
  mirrored in GLSL and TS so the ship rides the exact same surface).
  Fragment: depth gradient, crest lift, horizon fresnel, distance-attenuated
  moon-path specular, exp² fog.
- **Ship** — fully procedural galley (lathe hull widest at the gunwale,
  bellied square sail, upswept stem/stern, rigging, flickering stern
  lantern). Bobs and rolls via the wave field's analytic slope, smoothed.
- **Sky** — 2,400-star Points cloud (seeded PRNG → identical sky for every
  visitor, a deliberate "same night everywhere" statement), twinkle in the
  vertex shader; moon = emissive disc + additive halo sprite + the scene's
  key directional light, `fog=false` so it burns through the haze.
- **Atmosphere** — FogExp2 + drifting soft-sprite mist banks skimming the water.
- **Weather as narrative** — each chapter owns `{waveAmp, fogDensity, fogColor, moonIntensity, ambient, waterColor}`; GSAP tweens all six with the camera, so the storm of The Trials *arrives* rather than switches.

## 6. Motion & Sound Design

**Motion grammar:** one easing family (`power2.inOut`), 3.4 s chapter
travels, 1.4 s text reveals, and a perpetual idle — the camera's look-at
point orbits ±0.7 m on slow sines so even a still frame breathes.
`prefers-reduced-motion` collapses travel to instant cuts and freezes the
idle drift.

**Sound (generative, zero assets):** WebAudio graph built at runtime —
brown noise through a slow-breathing lowpass (the swell), three detuned
sine drones on A1/A2/E3 (the orchestral pedal), band-passed shimmer swells
(wind). Opt-in, 4 s fade-in, full teardown on mute. No files to load, no
licensing, instant start.

## 7. Component Architecture

```
src/
├── app/            layout (fonts, SEO, viewport) · page (server shell, sr-only narrative)
├── components/
│   ├── Experience.tsx        client shell; code-splits the 3D world (ssr:false)
│   ├── scene/
│   │   ├── OdysseyScene.tsx  Canvas, CameraDirector (GSAP), env refs, quality tiers
│   │   ├── Ocean.tsx         shader plane (uniforms driven by env refs)
│   │   ├── Ship.tsx          procedural galley + lantern
│   │   └── NightSky.tsx      Stars · Moon · Mist
│   └── ui/
│       ├── Hero.tsx          title, countdown, embark
│       ├── ChapterOverlay.tsx  narrative layer + journey recording
│       ├── VoyageControls.tsx  oars, dots, keyboard nav
│       ├── GatheringPanel.tsx  modal: VoyageLog · MyJourney (+ tabs)
│       ├── WorldMap.tsx      SVG chart, click-to-light
│       ├── Navigator.tsx     companion chat
│       ├── Countdown.tsx     premiere clock
│       ├── AudioToggle.tsx   ambience switch
│       └── Loader.tsx        themed suspense state
└── lib/
    ├── chapters.ts           chapter/theme/camera/environment data
    ├── waves.ts              wave math (GLSL + TS, tested)
    ├── time.ts               countdown math (tested)
    ├── navigator-brain.ts    scripted retrieval engine (tested)
    ├── ambience.ts           WebAudio engine
    └── store.ts              zustand stores (session + persisted memory)
```

Pattern: **refs across the React/three boundary.** Chapter changes tween
mutable refs (GSAP); `useFrame` reads them every frame. React re-renders
only for UI state — the 60 fps path never touches reconciliation.

## 8. Technical Implementation Plan

- **Stack:** Next.js 16 (App Router, static prerender) · React 19 ·
  TypeScript strict · React Three Fiber 9 / three 0.185 · GSAP (world
  tweens) · Framer Motion (DOM tweens) · Tailwind 4 · zustand 5.
- **SEO/a11y:** server-rendered narrative shell (sr-only) + full metadata;
  the canvas is `aria-hidden`, every interaction reachable by keyboard,
  `aria-live` chapter announcements, visible focus, `noscript` fallback.
- **AI Navigator:** currently a pure, tested, client-side retrieval brain
  (`navigatorReply()`); the UI is transport-agnostic, so phase 2 swaps in a
  `/api/navigator` route calling the Claude API (claude-sonnet-5) with a
  spoiler-guard system prompt — the scripted brain remains the offline/
  fallback path. API keys live in env vars, never in code.
- **Community backend (phase 2):** replace localStorage seeds with
  Postgres + row-level moderation queue; voyage log and map lights become
  optimistic writes; live reactions via SSE. The zustand interfaces
  (`LogEntry`, `MapLight`) are already the wire contract.
- **Testing:** vitest unit tests for all pure logic (20 passing); headless
  Chrome end-to-end sweep (embark → travel → log → map → navigator) used
  during development.

## 9. Performance Strategy

- **Code-split the world:** the R3F/three bundle loads behind a themed
  loader via `next/dynamic` (`ssr:false`); the server shell paints text
  instantly.
- **Quality tiers:** device heuristic (cores / mobile UA) halves ocean
  tessellation (256²→128²), star count, mist count, dpr, and disables MSAA.
- **Shader-first animation:** waves, twinkle, and moon path run entirely on
  the GPU; per-frame JS is ship pose + uniform copies — no allocations in
  `useFrame` loops.
- **One draw call each** for 2,400 stars (Points) and the ocean; procedural
  geometry and canvas textures mean the only network payloads are code and
  two font families.
- **Budget:** 60 fps desktop / 30+ fps mid-mobile; first paint < 1.5 s on
  4G (static HTML), world interactive < 4 s.

## 10. Development Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1 — The Voyage** | 3D world, five chapters, countdown, voyage log, map, timeline, achievements, Navigator (scripted), generative audio, a11y, tests | ✅ built |
| **2 — The Crowd** | Backend for log/map (Postgres + moderation), live "lights this hour" counter, Claude-powered Navigator behind `/api`, OG share images | next |
| **3 — The Premiere** | Release-night mode: synchronized global moment at T-0, "where did you watch it?" board promoted, after-phase default | before Jul 17 |
| **4 — The Memory** | Photo/memory wall with moderation, community achievement reveals, downloadable "voyage certificate" | post-release |

---

*Every decision above answers the master brief's question: how can
technology help people experience wonder together — and keep the memory
after the credits roll?*
