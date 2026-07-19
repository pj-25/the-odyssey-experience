<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The Odyssey Experience

Immersive 3D web experience celebrating Christopher Nolan's *The Odyssey*
(in theatres 2026-07-17). A night-sea voyage in five chapters with community
features. Full creative/technical spec: `DESIGN.md`. Original brief:
`master-prompt.md`.

## Commands

```bash
npm run dev     # dev server
npm run build   # production build (includes typecheck)
npm run start   # serve production build
npm run lint    # eslint (React Compiler rules enabled)
npm test        # vitest unit tests
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · React Three Fiber 9 /
three 0.185 · GSAP (3D-world tweens) · Framer Motion (DOM tweens) ·
Tailwind 4 (`@theme inline` in `globals.css`) · zustand 5.

## Architecture rules

- **Single route.** The whole experience lives at `/`; world state is
  zustand (`useVoyage`, `useExploration`), not URLs.
- **Refs across the React/three boundary.** Per-frame values live in
  mutable refs and the `shipPose`/`helmInput` module singletons, never
  React state; the HUD samples `shipPose` on an interval and the touch
  tiller writes `helmInput`. No allocations inside `useFrame` callbacks.
- **Input is capability-detected, not device-sniffed.** `pointer: coarse`
  (`src/lib/device.ts`) decides between gesture and keyboard affordances;
  every action must remain reachable by both a button and a key.
- **Gameplay logic is pure and tested.** Sailing physics
  (`src/lib/sailing.ts`), world layout/environment/collision
  (`src/lib/world.ts`), puzzles (`src/lib/puzzles.ts`), constellations
  (`src/lib/constellations.ts`), and the Navigator brain are plain
  functions with vitest coverage; scene components only integrate them.
- **`src/lib/waves.ts` is the single source of truth** for the ocean
  surface — the GLSL (`WAVE_GLSL`) and TS (`waveHeight`) implementations
  must stay in sync; the ship rides the TS version of the same field.
- **World tuning lives in data**, not components: places, stories, hints,
  environment presets, and keep-out cores are all in `src/lib/world.ts`.
  Events trigger from position/action (see `ShipController`), never from a
  script order.
- **Persisted community state** (`useMemoryBoard`) is localStorage-seeded
  today; its interfaces (`LogEntry`, `MapLight`) are the future wire
  contract — don't change them casually.
- **No binary assets.** Ship geometry, textures, and audio are all
  procedural (canvas textures, WebAudio). Keep it that way unless a real
  asset pipeline is introduced.
- **Spoiler policy:** all narrative content draws from Homer
  (public-domain Butler translation) and publicly known facts about the
  director's craft. Nothing from the film itself.
- Scene files (`src/components/scene/`) have the React Compiler lint rules
  (`react-hooks/purity|refs|immutability`) disabled — the useFrame mutation
  idiom is expected there, but keep UI components fully compliant.
- Unit-test pure logic in `src/lib/` (vitest, colocated `__tests__/`).
  Secrets go in env vars (`NEXT_PUBLIC_PREMIERE_ISO` overrides the premiere
  date; no keys are checked in).
