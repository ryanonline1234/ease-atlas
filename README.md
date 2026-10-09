# ease-atlas

Five web-motion primitives for React, built on measured easing constants rather
than invented ones.

**Status: planned.** Build starts after 2027-01-10. Nothing is here yet except
the plan, the provenance policy, and the gates the project has to pass.

## The set

One stack for all five: React 19, TypeScript, Tailwind v4 semantic tokens,
GSAP + `@gsap/react`. One easing vocabulary. One `data-*` API.

1. **EaseAtlas** (anchor) — a grid of named easing curves, each drawn as an SVG
   glyph with a marker riding the identical curve through CSS `linear()`. One
   function feeds both, so the drawing and the motion cannot disagree. Click to
   copy as `cubic-bezier(...)`, a GSAP name, or a CSS variable.
2. **MaskReveal** — line-mask text reveal on SplitText (`mask`, `autoSplit`,
   `aria`), word and character escalation, scroll-scrubbed variant.
3. **Cursor** — two-body dot and ring with exponential smoothing;
   `default / link / drag / media / hidden` states from delegated `data-cursor`
   attributes. Never replaces focus states; coarse pointers get a designed
   fallback.
4. **MediaReveal** — mask-not-opacity image reveal with clipped-frame parallax
   that never transforms the trigger element.
5. **Preloader** — honest, monotonic, timeout-safe progress with an anti-strobe
   floor and a warm-cache skip.

## Non-negotiables

- `prefers-reduced-motion: reduce` yields a static, complete page.
- Compositor-only properties (`transform`, `opacity`, `clip-path`).
- Motion is never the only affordance.
- Every duration, ease, and stagger traces to a named source.

## Provenance

Every block in this repo is authored here. Constants observed on other studios'
published sites are credited by name where they are used. Nothing reconstructed
from someone else's bundle ships. The rule is gate K0 in [DECISIONS.md](DECISIONS.md).

## Where it lives

This repository is canonical. The 21st.dev registry is a mirror. Adoption is
captured monthly in [`metrics/`](metrics/) under the protocol there; views are
never reported, installs, copies, and bookmarks are.

## License

MIT. See [LICENSE](LICENSE).
