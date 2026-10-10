# State — ease-atlas

_Updated: 2026-10-09_

## Now

Two components built and verified, unpublished:

- **InkHero** (`src/components/ui/ink-hero.tsx`, demo `src/demos/ink-hero/default.tsx`):
  spec 72/76 measured checks, positive control fails as it should, 0 long frames at
  120 Hz, flat-frame detector PASS, 0 shader errors, reduced-motion static. Stills in
  `tests/ink-hero/out/` (gitignored captures regenerate from the commands in README).
- **EaseAtlas** (`src/components/ui/ease-atlas.tsx`, demo `src/demos/ease-atlas/default.tsx`):
  30 unit tests, probe measures all 24 rides against f(t).

Playground: `npm run dev` → http://localhost:5178/?demo=ink-hero (or `ease-atlas`; `&dark=1`).
**Live:** https://ease-atlas.vercel.app (`?demo=ink-hero` default, `?demo=ease-atlas`, `&dark=1`),
Vercel project `ease-atlas` in ryanonline1234's scope, CLI-deployed (`vercel --prod --yes`), not
git-connected: redeploy by hand after changes. No 21st.dev account yet; no npm.

## Next

1. **Ryan's taste review of the hero** (the human pass): scroll it at 1440 wide in light
   and dark; judge the ride at 300vh travel, the station snap, the dissolve's noise scale
   (`noiseScale`, `feather`, `grain` are live controls in the demo), the headline copy,
   and whether the paper-station sheet reads. Anything changed goes back through
   `npm test`, `npm run probe`, and the harness sample/assert.
2. **Publish (Ryan is logged into the 21st CLI as ryanonline1234):** drafts are opened with
   `--prepare --no-open`; Ryan reviews the CLI Review link, then:
   `npm i -g @21st-dev/cli` → `21st login` → `21st search "scroll hero ink"` →
   `21st render ./src/components/ui/ink-hero.tsx --demo ./src/demos/ink-hero/default.tsx --out ./preview --video`
   → `21st publish ./src/components/ui/ink-hero.tsx --description "…" --tags hero,scroll,webgl,gsap,ink --prepare --wait-video --media-dir .21st-review`
   → review both themes → `--draft draft:<uuid> --auto --wait-video` → `21st submit ink-hero`.
   Then the same for `ease-atlas`. Start the monthly `metrics/` capture that day.
3. **InkReveal** next: extract the dissolve as a standalone media reveal, then MaskReveal
   and ScrollScore from the hero's parts.

## Gotchas

- Wikimedia serves only some thumbnail widths for this file: `1920px-` and `1280px-` exist,
  `1600px-` returns 400. The demo uses 1920.
- The harness's Chromium runs on SwiftShader; `jank` uses the real GPU. Both compile the
  shader. If `[SHADER_ERROR] null` ever appears, suspect a lost context, not GLSL.
- Tailwind with the Vite root at `playground/` needs `@source "../src";`.
- The atlas probe divides by `getBoundingClientRect()` sizes, not `offsetHeight`, and counts
  only `data-ride` animations.
