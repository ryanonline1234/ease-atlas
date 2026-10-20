# State — ease-atlas

_Updated: 2026-10-20_

## Now

- **InkHero** (20923): Featured on 21st.dev, frozen there by Ryan's rule (below). The install
  fixes from 2026-10-13 live in the repo and playground only; the README says so.
- **EaseAtlas** (20924): `needs_changes`, not pursued. Published by link only.
- **InkReveal** (22319): published 2026-10-20 at a 1200 ms develop, submitted, `in_review`.
  https://21st.dev/@ryanonline1234/components/ink-reveal. No generated video (21st kept the
  Wikimedia URLs, so its capture cannot load the demo). `registry-uploads/ink-reveal-demo.mp4`
  (12 s) can go up from the component page's Edit menu (media); whether a media edit during review
  matters is unknown. No code revisions while it is in review.
- **InkRidges**: draft `747554f3-9b19-4935-b0b2-b3d1e9d5f80c`, NOT published. Updated 2026-10-20
  with the reworked sky (`glow`, `clouds`) and occasional flocks (`birds`, `birdsEvery`), the new
  description, and a supplied 4:3 cover with a flock in the sky
  (`registry-uploads/ink-ridges-cover.jpg`). Video to upload by hand:
  `registry-uploads/ink-ridges-demo.mp4` (17 s, a flock crosses). Editor:
  https://21st.dev/studio/ryanonline1234/sandbox/fo5UWTruZSQhFfdsghNWpN?source=cli
  Verified: 74 unit tests (15 for InkRidges, including the JS port of the shader noise), typecheck,
  probe 10/10 (a flock crosses a still landscape and the loop goes idle again; the JS ridge line
  matches the drawn one within 0.02 with a seed-8 positive control at 0.045), fresh Next.js 16 and
  Vite 8 projects draw only while visible, real-GPU frame timing 0.42% / 0.21% dropped at 120 Hz.
- InkHero revision draft `48e12df1-8efe-486f-b72a-b50e2d67e20c` stays active and untouched.
- Playground: https://ease-atlas.vercel.app (git-connected: a push to main deploys).

## Next (Ryan's decisions, each with a rec)

**Rule (Ryan, 2026-10-19): on 21st.dev, publish or update only InkReveal. Never revise,
resubmit, withdraw, edit, or delete InkHero (20923) or EaseAtlas (20924).** A revision sends a
Featured component back into review. The InkHero revision draft 48e12df1 stays unpublished and
untouched; the fixes live in this repo only. New components (InkRidges) go up as new drafts;
publishing one still needs Ryan's go.

1. **Publish InkRidges?** Rec: yes, after Ryan looks at `?demo=ink-ridges` on the playground.
   Command: `21st publish ./src/components/ui/ink-ridges.tsx --demo ./src/demos/ink-ridges/default.tsx
   --description "$(cat <desc>)" --tags background,hero,webgl,landscape,animation --preview
   ./.21st-review/ink-ridges-cover.jpg --draft draft:747554f3-9b19-4935-b0b2-b3d1e9d5f80c --auto
   --no-open --json`, then `21st submit ink-ridges`. Upload the video afterwards.
2. **A walking animal along a ridge** instead of, or as well as, birds. Rec: no; at this scale it
   reads as a blemish (DECISIONS 2026-10-20).
3. Monthly metrics capture on 2026-11-01: `node scripts/capture-metrics.mjs` + Studio screenshot.
4. Pause rule starts this week: a week without Terra's ten logged hours pauses ease-atlas.

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
