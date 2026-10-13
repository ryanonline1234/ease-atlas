# State — ease-atlas

_Updated: 2026-10-13_

## Now

- **InkHero is Featured** on 21st.dev (component 20923, public, featured).
  https://21st.dev/@ryanonline1234/components/ink-hero
- **EaseAtlas** (20924) came back `needs_changes`; Ryan chose not to pursue it. Unlisted.
- Studio, last 30 days on 2026-10-13: 1,503 views, 6 copies, 12 bookmarks, 3 profile
  views, 0 clicks out, 0 CLI installs, weekly rank 551 of 1,004 authors
  (`metrics/2026-10-13-studio.png`). Page payload: `metrics/2026-10-13.json`.
- **Revision drafted, not published:** draft 48e12df1-8efe-486f-b72a-b50e2d67e20c fixes
  the Next.js build (`'use client'`), the Vite build (no parameter properties), black
  paper without shadcn tokens, and the silent blank on CORS-less images; adds the
  no-image mode and a search-led description. Publish only on Ryan's go:
  `21st publish ./src/components/ui/ink-hero.tsx --component component:20923 --demo ./src/demos/ink-hero/default.tsx --draft draft:48e12df1-8efe-486f-b72a-b50e2d67e20c --auto --json`,
  then confirm `21st components --json` still shows `featured`; if not, `21st resubmit ink-hero`.
- Verified on 2026-10-13: 45 unit tests, typecheck with `erasableSyntaxOnly`, probe 7/7
  (CORS fallback against a real no-CORS origin, no-image mode, rail, pointer), spec 72/76,
  fresh Next.js 16 + shadcn and Vite 8 + plain Tailwind v4 projects build and render the
  dissolve with a clean console.
- Playground: https://ease-atlas.vercel.app. The Vercel project is git-connected: a push
  to main deploys production.
- Gates: K2 1 of 5 (needs two of InkReveal, MaskReveal, ScrollScore). K3 and K4 start at
  the third Featured.

## Next

1. **Revision publish: weighed 2026-10-13, rec = wait until Mon 2026-10-19.** Publishing a
   revision sends Ink Hero back into review (Ryan confirmed), which takes it out of the catalog
   for the review window (the first review took about 3 days) during the newness spike and the
   Week 42 list. The fixes help a few code-copiers a week. Trigger to publish sooner: anyone
   reports the Next.js build error. If the draft has expired by then, re-run the `--prepare`
   command from DECISIONS (2026-10-13). Also: Ryan sets his 21st.dev profile's website and GitHub
   links; "Clicks out to you" counts those, and they are empty.
2. **Monthly capture on the 1st** (first 2026-11-01): `node scripts/capture-metrics.mjs`,
   a Studio screenshot into `metrics/`, any contact into `metrics/inbound.md`.
3. **InkReveal next:** the dissolve as a standalone media reveal with a `progress` prop
   (hover, scroll, or controlled), then MaskReveal and ScrollScore. K2 needs two of three.
4. From 2026-10-19: a week without Terra's ten logged hours is a week ease-atlas pauses.

## Gotchas

- The 21st.dev CDN sends CORS headers only to requests with an Origin and caches the plain
  response without `Vary`. Never request the same image URL in two modes on one page.
- Playwright `route.fulfill` bypasses CORS; test a bad image host with a real second origin.
- Self-installs count. Test installs file-level in a scratch project, not with `21st add`.

- Registry auto-cover capture refuses demos that link off-origin (`?demo=` links). Keep the
  registry demos self-contained; supply covers with `--preview` when in doubt.
- Wikimedia serves `1920px-` and `1280px-` thumbs for the demo image; `1600px-` is a 400.
- The harness's Chromium runs on SwiftShader; `jank` uses the real GPU. `[SHADER_ERROR] null`
  means a lost context, not GLSL.
- Tailwind with the Vite root at `playground/` needs `@source "../src";`.
- The atlas probe divides by `getBoundingClientRect()` sizes and counts only `data-ride`
  animations.
