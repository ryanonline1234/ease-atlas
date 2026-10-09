# State — ease-atlas

_Updated: 2026-10-09_

## Now

`EaseAtlas` is built and verified, unpublished. 30 unit tests, clean typecheck,
28 browser-probe checks (all 24 curves measured against their functions, positive
control, reduced motion, no page errors). Playground: `npm run dev` →
http://localhost:5178 (`?dark=1` for dark). No 21st.dev account yet; no npm.

Budget used so far (K1): about 4 wall-clock hours, Claude-driven; Ryan-hours 0.

## Next

1. **Ryan's taste review (about an hour):** run the playground in light and dark,
   hover the grid, judge the ride feel at 1200 ms and the ghost marker, read the
   24 cards for wrong or unwanted entries, and list nits. Anything he wants
   changed goes through the tests and the probe.
2. **Account and first publish (Ryan, with a parent aware of the under-16
   disclaimer):** `npm i -g @21st-dev/cli` → `21st login` → `21st search "easing"`
   → `21st render ./src/components/ui/ease-atlas.tsx --demo ./src/demos/default.tsx --out ./preview`
   → `21st publish ./src/components/ui/ease-atlas.tsx --description "…" --tags easing,motion,animation,react,css --prepare --wait-video --media-dir .21st-review`
   → review both themes → `21st publish … --draft draft:<uuid> --auto`
   → `21st submit ease-atlas`. Start the monthly `metrics/` capture that day.
3. **MaskReveal** next (GSAP + `@gsap/react` enter the stack), inside K1.

## Gotchas

- Tailwind v4 with the Vite root at `playground/` needs `@source "../src";` in
  the playground CSS or no component class is generated (found by the probe:
  every size came back zero).
- The probe must divide by `getBoundingClientRect()` sizes, not `offsetHeight`,
  or integer rounding shows up as a 0.3% error.
- `getAnimations({ subtree: true })` on a hovered cell includes four
  border-color transitions; count only elements with `data-ride`.
