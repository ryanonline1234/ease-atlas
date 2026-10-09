# ease-atlas

Five web-motion primitives for React, built on measured easing constants rather
than invented ones.

**Status:** the anchor component, `EaseAtlas`, is built and verified. Nothing is
published yet. The other four are planned (see below).

## EaseAtlas

A grid of 24 named easing curves. Each cell draws the curve as an SVG glyph and
rides a marker through the plot using the identical sampled function as a CSS
`linear()` timing function. One function feeds both, so the drawing and the
motion cannot disagree. A faint second marker rides the diagonal so the lead or
lag against linear is visible at every moment. Click a cell to copy the curve as
CSS (`cubic-bezier()` or `linear()`), as a GSAP ease (or a `CustomEase.create`
call), or as a CSS custom property.

The 24 curves and their sources: the easings.net bezier twins of GSAP's
`power1–4.out`, `expo.out/in/inOut`, `power2.inOut` and `back.out`; the CSS
`linear` and `ease` keywords as references; Emil Kowalski's `ease-out`,
`ease-in-out` and the Vaul drawer curve; Material 3 and IBM Carbon system
curves; GSAP's `elastic.out` and `bounce.out`; and three curves observed on
published sites (osmo.supply, lusion.co, oneshot-sakura.vercel.app), listed as
observed values with the site named on the card.

Single file, no runtime dependency beyond React:
[`src/components/ui/ease-atlas.tsx`](src/components/ui/ease-atlas.tsx). Demo
with a live controls panel: [`src/demos/default.tsx`](src/demos/default.tsx).

| Prop | Default | What it does |
|---|---|---|
| `curves` | the 24-entry `ATLAS` | Any `AtlasEntry[]`; values in cubic-bezier, GSAP, Penner, CSS keyword or CustomEase path notation |
| `columns` | `4` | Columns at full width; the grid drops columns on narrow containers |
| `duration` | `1200` | Ride duration in ms; the viewer is watching, not waiting |
| `autoplay` | `false` | Loop every curve; otherwise a curve rides on hover or focus |
| `showGhost` | `true` | The linear comparison marker |
| `showCode` | `false` | Print the CSS value under each curve instead of its source |
| `format` | `'css'` | Initial copy format: `'css'`, `'gsap'`, `'token'` |
| `onCopy` | — | `(entry, text) => void`, called after every copy |

Styling uses shadcn-style semantic tokens only (`bg-card`, `text-primary`,
`border-border`, …). Under `prefers-reduced-motion: reduce` nothing animates
and every marker sits at the end of its curve. Cells are buttons; the format
switch is a keyboard-operable radio group; copies are announced to screen
readers.

**Browser support to confirm before relying on it:** the ride uses the CSS
`linear()` easing function through the Web Animations API. Chrome 113+, Safari
17.2+ and Firefox 112+ ship it at the time of writing; check caniuse for your
targets.

## Verification

```bash
npm test            # 30 unit tests: parser, sampler, atlas integrity, copy text, component behaviour
npm run typecheck
npm run probe       # Chromium: pauses each cell's real animation, seeks it, and compares the marker's position with f(t)
npm run dev         # playground at http://localhost:5178 (?dark=1 for dark)
```

The probe is the claim's proof: for all 24 curves it reads the marker's actual
transform at nine on-grid and five off-grid times and requires agreement with
the parsed function to 0.05% on-grid and 1% between stops, checks the
reduced-motion path, captures light and dark screens, and includes a positive
control that must fail when a curve is compared with the wrong function.
Sampling density is adaptive: 64 stops unless the polyline misses the function
by more than 0.5% between stops, in which case it doubles (bounce and elastic
need more). The glyph and the ride always share the same stops.

## The planned set

One stack for all five: React 19, TypeScript, Tailwind v4 semantic tokens;
GSAP + `@gsap/react` from the second component on. One easing vocabulary. One
`data-*` API.

1. **EaseAtlas** — built.
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
