# State — ease-atlas

_Updated: 2026-10-20_

## Now

- **InkHero** (20923): Featured on 21st.dev, frozen there by Ryan's rule (below). The install
  fixes from 2026-10-13 live in the repo and playground only; the README says so.
- **EaseAtlas** (20924): `needs_changes`, not pursued. Published by link only.
- **InkReveal** (22319): published 2026-10-20 at a 1200 ms develop, `in_review`. Brushed up the
  same day on Ryan's go (fiber-wicking edge, crisp dark-paper edge) with two add-ons: `restSrc`
  (a second image at rest) and `trigger: 'scroll'`. Registry revision published 2026-10-20 (draft ca94b9e1, same
  component id, still `in_review`); the live preview develops on hover from 21st's CDN copies of
  the images (21st mirrored the literal Wikimedia URLs this time).
  Media to upload by hand if 21st generates none: `registry-uploads/ink-reveal-demo.mp4` (20 s:
  hover tour, then paired prints) and `registry-uploads/ink-reveal-cover.jpg` (4:3).
- **InkRidges**: draft `747554f3-9b19-4935-b0b2-b3d1e9d5f80c`, NOT published. 2026-10-20: painted
  sun that blooms last, `moon: 'auto'` on dark paper, vermilion default sun, brushed crests,
  `scrollDepth` (far ridges lag, the sun sets on scroll). Draft updated 2026-10-20 with this source, description and cover. Video to upload
  by hand: `registry-uploads/ink-ridges-demo.mp4` (22 s: paint-in, flock, sunset on scroll, moon).
  Editor: https://21st.dev/studio/ryanonline1234/sandbox/fo5UWTruZSQhFfdsghNWpN?source=cli
- Verified 2026-10-20: 84 unit tests, typecheck, build, probes 58/58 (all four components); fresh Next.js 16 and
  Vite 8 projects build and run both (ridges 60 draws per 500 ms visible, 0 offscreen; paired card
  hovers to 1; scroll card 0.20 → 0.89 over 500 px; clean console); real-GPU timing in DECISIONS.
- InkHero revision draft `48e12df1-8efe-486f-b72a-b50e2d67e20c` stays active and untouched.
- Playground: https://ease-atlas.vercel.app (git-connected: a push to main deploys).

## Next (Ryan's decisions, each with a rec)

**Rule (Ryan, 2026-10-19): on 21st.dev, publish or update only InkReveal. Never revise,
resubmit, withdraw, edit, or delete InkHero (20923) or EaseAtlas (20924).** A revision sends a
Featured component back into review. The InkHero revision draft 48e12df1 stays unpublished and
untouched; the fixes live in this repo only. New components (InkRidges) go up as new drafts;
publishing one still needs Ryan's go.

1. **Publish InkRidges?** Rec: yes, after Ryan looks at `?demo=ink-ridges` (light and dark).
   `21st publish ./src/components/ui/ink-ridges.tsx --demo ./src/demos/ink-ridges/default.tsx
   --description "$(cat <desc>)" --tags background,hero,webgl,landscape,animation --preview
   ./.21st-review/ink-ridges-cover.jpg --draft draft:747554f3-9b19-4935-b0b2-b3d1e9d5f80c --auto
   --no-open --json`, then `21st submit ink-ridges`. Upload the video afterwards.
2. **More InkRidges ideas** (not built): a lake with reflections; pine clusters on the near ridge;
   weather; mist parting around the pointer. Rec: none now; ship what exists and watch metrics.
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
