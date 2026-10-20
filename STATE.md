# State — ease-atlas

_Updated: 2026-10-20_

## Now

- **InkHero** (20923): Featured on 21st.dev, frozen there by Ryan's rule (below). The install
  fixes from 2026-10-13 live in the repo and playground only; the README says so.
- **EaseAtlas** (20924): `needs_changes`, not pursued. Published by link only.
- **InkReveal**: built and verified 2026-10-19, not on the registry.
  `src/components/ui/ink-reveal.tsx`, demo `src/demos/ink-reveal/default.tsx`, playground
  `?demo=ink-reveal`. React only; one WebGL context for every card; hover, inView, manual.
  Verified: 59 unit tests, typecheck with `erasableSyntaxOnly`, probe 9/9 (one context for four
  cards, hover develop and recede, inView, manual, touch → inView, rest ghost not blank,
  reduced motion with zero contexts, real no-CORS origin), positive controls on the
  shared-context and hover tests, fresh Next.js 16 + shadcn and Vite 8 + plain Tailwind v4
  projects build and run with no added packages (one context, hover, keyboard focus).
  Hero and atlas probes rerun green.
- Registry login: returned HTTP 401 once on 2026-10-19, working again later the same day.
- **Drafts ready, nothing published:** InkReveal `draft:322ae250-0b96-46a2-afe5-69f855c798fd`
  (editor https://21st.dev/studio/ryanonline1234/sandbox/7ciD5APhFPFWmyKp4urNmV?source=cli,
  staged cover supplied); InkHero revision `draft:48e12df1-8efe-486f-b72a-b50e2d67e20c` still active.
- Playground: https://ease-atlas.vercel.app (git-connected: a push to main deploys).

## Next (Ryan's decisions, each with a rec)

**Rule (Ryan, 2026-10-19): on 21st.dev, publish or update only InkReveal. Never revise,
resubmit, withdraw, edit, or delete InkHero (20923) or EaseAtlas (20924).** A revision sends a
Featured component back into review. The InkHero revision draft 48e12df1 stays unpublished and
untouched; the fixes live in this repo only.

1. **InkReveal PUBLISHED 2026-10-20** (component 22319, `in_review` after `21st submit`), develop
   time 1200 ms. https://21st.dev/@ryanonline1234/components/ink-reveal
   No video: 21st kept the Wikimedia URLs (it did not copy template-built URLs to its CDN), so its
   capture still cannot record the demo. Ryan can add `registry-uploads/ink-reveal-demo.mp4` (12 s)
   from the component page's Edit menu (media); whether a media edit during review matters is
   unknown. Under the freeze rule, InkReveal is now live: no code revisions while it is in review.
   **InkRidges**: draft 747554f3 held; Ryan asked for a reworked sky and occasional birds first.
2. **InkRidges** built and verified 2026-10-20 (`src/components/ui/ink-ridges.tsx`, demo
   `src/demos/ink-ridges/default.tsx`, playground `?demo=ink-ridges`): probe 8/8 (stable across 3
   reruns after a polled repaint check), positive control on the frame gating, fresh Next.js 16 and
   Vite 8 projects clean, real-GPU frame timing passes.
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
