# State — ease-atlas

_Updated: 2026-10-19_

## Now

- **InkHero** (20923): Featured on 21st.dev. Install-fix revision built and verified in the
  repo (2026-10-13), not yet on the registry. The planned publish date was today.
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

1. (done: login works again)
2. Publish InkReveal and submit it for featuring. Rec: yes. Run the same `21st publish` line
   with `--draft draft:322ae250-0b96-46a2-afe5-69f855c798fd --auto --json`, then `21st submit ink-reveal`.
3. Publish the InkHero revision (today was the planned date). Rec: yes. Draft 48e12df1 is still
   active: `--draft draft:48e12df1-8efe-486f-b72a-b50e2d67e20c --auto --json`, then confirm status
   and `21st resubmit ink-hero` if it dropped to review.
4. Swap ScrollScore for InkRidges as the fourth component. Rec: yes (visual, distinctive,
   mostly written already in the hero's no-image mode).
5. Monthly metrics capture on 2026-11-01: `node scripts/capture-metrics.mjs` + Studio screenshot.
6. Pause rule starts this week: a week without Terra's ten logged hours pauses ease-atlas.

## Gotchas

- The 21st.dev CDN sends CORS headers only to requests with an Origin and caches the plain
  response without `Vary`. Never request one image URL in two modes on a page.
- Playwright `route.fulfill` bypasses CORS; test a bad image host with a real second origin.
- Self-installs count. Test installs file-level in a scratch project, not with `21st add`.
- `every()` on an empty list is true: readiness checks must assert the expected count first.
- Long probe runs fail across a lid-closed sleep; check `pmset -g log` before debugging.
- Registry auto-cover capture refuses demos that link off-origin; supply covers with `--preview`.
- Wikimedia serves `960px-`, `1280px-`, `1920px-` thumbs; `1600px-` is a 400.
- Tailwind with the Vite root at `playground/` needs `@source "../src";`.
