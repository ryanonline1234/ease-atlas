# State — ease-atlas

_Updated: 2026-10-20_

## Now

- **InkHero** (20923): Featured on 21st.dev, frozen there by Ryan's rule (below). The install
  fixes from 2026-10-13 live in the repo and playground only; the README says so.
- **EaseAtlas** (20924): `needs_changes`, not pursued. Published by link only.
- **InkReveal** (22319): FEATURED 2026-10-20 (published at a 1200 ms develop). Brushed up the
  same day on Ryan's go (fiber-wicking edge, crisp dark-paper edge) with two add-ons: `restSrc`
  (a second image at rest) and `trigger: 'scroll'`. Registry revision published 2026-10-20 (draft ca94b9e1, same
  component id, still `in_review`); the live preview develops on hover from 21st's CDN copies of
  the images (21st mirrored the literal Wikimedia URLs this time).
  Demo video UPLOADED 2026-10-20 through the component page's Edit dialog (18 s, 4:3, hover tour then
  paired prints; `docs/media/ink-reveal-demo.mp4`). Controls reset to the detected panel on Ryan's
  yes: the public preview now has the Paired toggle.
- **InkRidges** (22423): FEATURED 2026-10-20 (published on Ryan's go the same day).
  https://21st.dev/@ryanonline1234/components/ink-ridges. Supplied 4:3 cover; demo video uploaded
  through the Edit dialog (16 s, `docs/media/ink-ridges-demo.mp4`). Live preview checked in both
  themes (painted sun on light paper, moon on dark). Revised the same night so the listing has
  preview controls (15; the demo's settings had held a TS cast); video re-uploaded after it.
- Verified 2026-10-20: 84 unit tests, typecheck, build, probes 58/58 (all four components); fresh Next.js 16 and
  Vite 8 projects build and run both (ridges 60 draws per 500 ms visible, 0 offscreen; paired card
  hovers to 1; scroll card 0.20 → 0.89 over 500 px; clean console); real-GPU timing in DECISIONS.
- **InkHeadline** (23095): published 2026-10-20, `in_review`.
- InkHero revision draft `48e12df1-8efe-486f-b72a-b50e2d67e20c` stays active and untouched.
- Playground: https://ease-atlas.vercel.app (git-connected: a push to main deploys).

## Gates
K2 PASSED 2026-10-20 (Ink Hero, Ink Reveal, Ink Ridges Featured: 3 of 5). Clocks from the third
Featured: **K3 adoption on 2026-12-19** (set-median bookmarks ≥60, set-total CLI installs ≥10; freeze
below 22 / 5), **K4 outside signal on 2027-01-18**. npm and a second set wait for both (K6).

## Next (Ryan's decisions, each with a rec)

**Rule (Ryan, 2026-10-19; extended 2026-10-20): on 21st.dev, never revise, resubmit, withdraw, edit,
or delete a Featured component: InkHero (20923), InkReveal (22319), InkRidges (22423). EaseAtlas
(20924) stays untouched too.** Media-only edits through the Edit dialog were done before the freeze
was extended; even those wait for Ryan's go now. A revision sends a
Featured component back into review. The InkHero revision draft 48e12df1 stays unpublished and
untouched; the fixes live in this repo only. New components (InkRidges) go up as new drafts;
publishing one still needs Ryan's go.

1. **InkHeadline PUBLISHED 2026-10-20** on Ryan's go (component 23095, submitted, `in_review`):
   https://21st.dev/@ryanonline1234/components/ink-headline. Video still to upload through the Edit dialog
   (`docs/media/ink-headline-demo.mp4`); the browser pane was signed out after the session restarted, so
   it waits for Ryan to sign in there. Once Featured, it joins the freeze.
2. **InkLake** (a lake with reflections, its own component): first in line for a second set, which K6
   allows only after K3 (2026-12-19) and K4 (2027-01-18) pass. Not built or published before then.
3. Monthly metrics capture on 2026-11-01: `node scripts/capture-metrics.mjs` + Studio screenshot.
4. Pause rule: a week without Terra's ten logged hours pauses ease-atlas.

## Gotchas

- The 21st.dev CDN sends CORS headers only to requests with an Origin and caches the plain
  response without `Vary`. Never request one image URL in two modes on a page.
- Playwright `route.fulfill` bypasses CORS; test a bad image host with a real second origin.
- Self-installs count. Test installs file-level in a scratch project, not with `21st add`.
- `every()` on an empty list is true: readiness checks must assert the expected count first.
- Long probe runs fail across a lid-closed sleep; check `pmset -g log` before debugging.
- 21st's capture sandbox blocks every outside host: a demo that loads external images gets no
  generated cover or video before publish. Supply the cover with `--preview`; record the video here.
- Demos must import the component relatively (`../../components/ui/<file>`) so the CLI rewrites it.
- Wikimedia serves `960px-`, `1280px-`, `1920px-` thumbs; `1600px-` is a 400.
- Tailwind with the Vite root at `playground/` needs `@source "../src";`.
- Headless Chromium without GPU flags renders WebGL through SwiftShader: ~11 s per dpr-2
  screenshot of InkRidges. For captures, launch with `--use-angle=metal --enable-gpu
  --ignore-gpu-blocklist --enable-gpu-rasterization` (what `capture_motion.mjs --gpu` uses).
- A PreToolUse hook blocks `rm -rf`; write to a fresh output directory instead.
