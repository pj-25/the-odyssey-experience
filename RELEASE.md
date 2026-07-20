# Release Checklist — The Odyssey Voyage (fan-made)

Status: **ready for release**. Every item below was validated against the
production build (`npm run build && npm run start`) on 2026-07-20.

## Identity & legal posture

- [x] Hero states "An unofficial fan-made tribute · by movie lovers, for
      movie lovers" above the title, with a plain-language non-affiliation
      disclaimer beneath the call to action.
- [x] Journal → **About** tab carries the full statement: independent,
      unofficial, not affiliated with/endorsed by the filmmakers, studio,
      distributors, or rights holders; no film assets used; seeded log
      entries disclosed as illustrative; visitor data stays on-device.
- [x] Page metadata, OpenGraph/Twitter cards, crawler text, and `noscript`
      all identify the project as an unofficial fan tribute.
- [x] No copyrighted assets anywhere: all geometry, textures, audio, and
      images are procedural; quotations are Samuel Butler's public-domain
      translation; the social image and favicon are code-generated.

## User journeys (all automated, all passing)

- [x] Desktop (13 checks × 2 runs): embark → free sail → steer →
      constellations → all five discoveries → both puzzles → beacon →
      dive → storm → hidden-city finale → Navigator recall → journal.
- [x] Mobile / touch, iPhone-class viewport (9 checks): no overflow in
      portrait or landscape, gesture legend, one-finger steering (real
      CDP touch events), sail/star/action taps, bottom sheets.
- [x] Orbit camera: rotate / zoom / pan / idle-return, desktop and touch.
- [x] Release checks (9): disclaimers, About tab, Escape-close,
      post-release Navigator copy, and the full no-WebGL journey.
- [x] Zero console errors or page errors across every suite.

## Resilience & fallbacks

- [x] No WebGL → the "lightweight harbour": pure-CSS night sea, no dead
      helm controls, journal auto-opens, voyage log / travellers' map /
      Navigator fully functional. Also reachable via `?no3d=1`.
- [x] Runtime scene crash → error boundary drops to the same harbour
      (community features unaffected).
- [x] Route-level failure → themed `error.tsx` with recovery, noting that
      local data is safe.
- [x] JavaScript disabled → `noscript` message.
- [x] `prefers-reduced-motion` → DOM animations collapse (CSS), storm
      camera shake and discovery orbit disabled in 3D.

## Performance

- [x] 3D bundle code-split behind a themed loader; text paints first.
- [x] Device quality tiers: tessellation, star/mist/rain counts, MSAA,
      and devicePixelRatio (≤1.5 on constrained devices).
- [x] No binary assets: network payload is code + two font families.
- [x] No allocations in frame loops; HUD samples state at 8 Hz off the
      render path.

## Content & consistency

- [x] Post-premiere copy: countdown shows "in theatres", Navigator speaks
      in the present tense, log invites before/after reflections.
- [x] Scaffold leftovers removed (stock favicon, sample SVGs, template
      README copy).
- [x] Typography, spacing, and panel styling consistent across HUD,
      sheets, dialogs, and cards.

## Deploy notes

- Set `NEXT_PUBLIC_SITE_URL` to the public origin (used by metadataBase
  for absolute OpenGraph URLs).
- Optional: `NEXT_PUBLIC_PREMIERE_ISO` overrides the premiere moment.
- Static prerender: any Node host or edge platform running
  `npm run build && npm run start` (or the equivalent adapter) works.

## Known limitations (accepted, not blocking)

- Community features are seeded/local until the phase-2 backend
  (`DESIGN.md` roadmap); the About tab discloses this.
- Firefox/Safari were not covered by the automated suite (Chromium only);
  the stack (three.js WebGL1/2, standard pointer events) is
  cross-browser conservative.
