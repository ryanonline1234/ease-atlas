# State — ease-atlas

_Updated: 2026-10-09_

## Now

**Published.** Both components are on 21st.dev and in the Featured review queue:

- InkHero — https://21st.dev/@ryanonline1234/components/ink-hero (component 20923, in review)
- EaseAtlas — https://21st.dev/@ryanonline1234/components/ease-atlas (component 20924, in review)

Live playground: https://ease-atlas.vercel.app (CLI-deployed, manual redeploys).
Repo is canonical. Day-zero metrics: `metrics/2026-10-10.json`. Inbound log: `metrics/inbound.md`.
Draft allowance: 18/20 remaining.

Verification state unchanged since the last commit: spec 72/76, probe green (rail + pointer
included), frame detector PASS, 43 unit tests, typecheck clean.

## Next

1. **Watch the Featured review.** `21st components --json` shows `reviewStatus`. "Needs
   changes" → read the feedback, fix, `21st publish … --component component:<id>`, then
   `21st submit <slug>` again. Gate K2: ≥3 of 5 Featured within 30 days of the last submit
   (only two submitted so far; the extracted parts make up the five).
2. **Monthly capture on the 1st:** `node scripts/capture-metrics.mjs` plus a Studio dashboard
   screenshot into `metrics/`; log any contact in `metrics/inbound.md`. First capture
   2026-11-01. Fix the view-counter parser then, against a page that has counts.
3. **InkReveal next:** extract the dissolve as a standalone media reveal with a `progress`
   prop (hover / scroll / controlled), then MaskReveal and ScrollScore from the hero.
4. Rule still applies: a week without Terra's ten logged hours is a week ease-atlas pauses.

## Gotchas

- Registry auto-cover capture refuses demos that link off-origin (`?demo=` links). Keep the
  registry demos self-contained; supply covers with `--preview` when in doubt.
- Wikimedia serves `1920px-` and `1280px-` thumbs for the demo image; `1600px-` is a 400.
- The harness's Chromium runs on SwiftShader; `jank` uses the real GPU. `[SHADER_ERROR] null`
  means a lost context, not GLSL.
- Tailwind with the Vite root at `playground/` needs `@source "../src";`.
- The atlas probe divides by `getBoundingClientRect()` sizes and counts only `data-ride`
  animations.
