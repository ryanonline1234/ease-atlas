# Decisions — ease-atlas

Append-only. Gates and thresholds below were written on 2026-10-09, before any
code, so they cannot be moved after the numbers come in.

## 2026-10-09 — Kill gates K0–K6, pre-registered

Thresholds are anchored to a 51-component sample of recently published
21st.dev components (aged 20–60 days, read 2026-10-09): hand-published
components had a median of 22 bookmarks and 2 CLI installs in six weeks;
components by authors with ten or fewer components had a median of 59.5
bookmarks. A set that cannot clear those medians is performing below the
ordinary catalog entrant, and the claim that this work is distinctive has
failed on its own terms.

| Gate | When | Pass | Kill |
|---|---|---|---|
| K0 Provenance | Before any publish | Every block in the set traces to an authored source; observed constants are credited by name on the page and in the README; no block with `verbatim` or `inferred` provenance ships | Any block fails the trace → it does not ship; no exceptions |
| K1 Budget | Rolling | ≤45 wall-clock hours and ≤15 owner-hours for the first set | Budget exhausted with fewer than three components published → stop, keep the repo, publish nothing further |
| K2 Catalog | 30 days after the last `21st submit` | ≥3 of 5 components Featured after at most one "Needs changes" round each | 0–1 Featured → stop publishing; the set stays on GitHub only |
| K3 Adoption | 60 days after the third component is Featured | Set-median bookmarks ≥60 (the small-author median) and set-total CLI installs ≥10; continuing at all requires set-median bookmarks ≥22 (the hand-published median) | Set-median bookmarks <22 or total CLI installs <5 → freeze: no second set, maintenance only |
| K4 Outside signal | 90 days after the third component is Featured | At least one: an issue, PR or star burst from a stranger; a named site or project that adopted a component; a weekly "Best Components" listing; an inbound message from someone with standing | None → freeze; registry metrics are not reported anywhere; the project is described as a hands-on build without registry numbers |
| K5 Attribution | Any time | — | Any credible report that a block is someone else's → pull that component the same day, then resolve |
| K6 Second set | After K3 and K4 | Both passed → a second set of up to five is allowed, same gates | Either failed → no second set |

Reporting rule, fixed now: installs, copies, and bookmarks are reportable;
views are not, ever. The platform's view counter runs hundreds of views per
bookmark with an undocumented counting method.

## 2026-10-09 — Scope: five authored motion primitives, EaseAtlas first
EaseAtlas, MaskReveal, Cursor, MediaReveal, Preloader, in that order. Rejected:
a magnetic button (at least nine already exist on the registry); hero and
pricing sections (breadth, no thesis); a soccer-pitch data-viz set (off-thesis;
optional add-on only after K3).

## 2026-10-09 — Stack: GSAP + @gsap/react, not Motion
GSAP keeps `quickTo`, SplitText `mask`, and Flip intact; SplitText has been free
for commercial use since 2025-04-30; GSAP is already declared on featured
registry components. Rejected: porting to Motion to match the catalog majority.

## 2026-10-09 — Provenance policy
Only authored code ships. Observed constants from other studios' sites are
credited by name on the component page and in the README, and are labeled as
observed, never as original. One inherited text-reveal recipe with a known
lineage (Osmo / Codrops / GSAP, May 2025) is rewritten and credited before it
ships. Nothing reconstructed from another site's production bundle is used.

## 2026-10-09 — This repo is canonical; the registry is a mirror
GitHub holds the source, demos, README credits, and dated monthly metrics.
A 21st.dev account is created when the first component is ready, not before.
An npm package is deferred until K3 and K4 both pass.

## 2026-10-09 — Build window: January to March 2027
Existing commitments run through 2027-01-10. Rejected: a quick one-or-two
component drop now to start the clock; the set only reads as a library, and
K3 is measured on the set.

## 2026-10-09 — Name
`ease-atlas`, after the anchor component. Checked free on GitHub, npm, and the
21st.dev sitemap on 2026-10-09. Rejected: `motion-primitives` (an existing
library of that name).

## 2026-10-09 — Start now, not January
Ryan asked why wait; the January date was a scheduling assumption, not evidence.
His own share of the budget is 10–15 hours, about an hour a week, and an earlier
start resolves the gates sooner. Rule added: any week the other standing
commitment's hours are not logged is a week this project pauses.

## 2026-10-09 — EaseAtlas has no runtime dependency; rides use the Web Animations API
The engine evaluates every curve itself, so GSAP is not needed for the anchor
(it enters with MaskReveal). WAAPI keeps the component to one self-contained
file with no stylesheet or keyframe names, composites transforms only, and makes
every ride seekable, which is what lets the probe pause an animation at exact
times and measure it. Rejected: CSS `@keyframes` injected from the component
(needs a style element and global names); GSAP for the ride (a dependency the
anchor does not need).

## 2026-10-09 — Repo mirrors the registry's Studio layout
`src/components/ui/<slug>.tsx`, `src/demos/default.tsx`, `@/` → `src`. The CLI
sends one self-contained component file and one demo, auto-detecting
`demos/default.tsx`, so the repo's shape is the publish shape and nothing is
rearranged at publish time. Verified against help.21st.dev on 2026-10-09.

## 2026-10-09 — Sampling density is adaptive and shared
64 stops unless the polyline through them misses the function by more than 0.5%
at the midpoints; then 128, 256, 512. The glyph path, the `linear()` timing
function and the copied `linear()` text all use the same stops, so the three
cannot disagree. Found by the probe: bounce.out at 64 stops missed by 1.1% near
its first bounce.

## 2026-10-09 — Verification is measurement, not screenshots
The probe pauses each cell's real animation in Chromium, seeks it to on-grid and
off-grid times, reads the marker's computed transform and compares it with the
parsed function; it includes a positive control that fails when a curve is
compared with the wrong function, a reduced-motion check, a page-error check,
and light/dark captures for the taste review. Screenshots are for judgment only.

## 2026-10-09 — The headline piece is a signature scroll hero, not four quiet primitives
Ryan: "Instead of focusing on something so practical could we make something that
seems impressive." The platform data agrees: the most-bookmarked components are
scroll-driven hero sequences and single striking effects (scroll-expansion-hero
10.3k bookmarks, container-scroll-animation 9.9k, scroll-locked-video-hero 2.8k in
its first seven weeks), while the hero lane is also the most crowded (~400), so the
piece needs one specific idea. Chosen: an ink-wash hero scored in three stations —
the image develops from wash to print as you scroll, the headline bleeds in line by
line, the nav settles — fusing the sumi-e and scroll-journey families with the
measured curves. The demo's controls retime it live with any atlas curve. Its parts
(ink media reveal, text reveal, scroll score) ship afterwards as their own
components. EaseAtlas stays published as the instrument. Rejected: a lone WebGL
micro-effect (commodity lane); the ease theater alone (nice, not impressive).

## 2026-10-09 — K1 revised: no wall-clock cap
Ryan: "Don't worry about clock hours." K1 becomes a readiness gate: the hero does not
publish until the scroll spec's assertions pass in measurement, the reduced-motion
path renders a complete static page, both themes pass review, and gate K0 clears
every block. K2–K6 unchanged; the set is EaseAtlas, the hero, and its extracted parts.

## 2026-10-09 — Shader provenance rule, made explicit
The ink dissolve shader is authored from first principles (an integer hash, value
noise, fbm, a feathered threshold). No GLSL is copied from memory or from any site.
If an MIT-licensed block is ever adapted, its license header stays in the file and
the credit appears on the component page, which is what K0 and the registry Terms
both require; the K0 "verbatim" ban targets code reconstructed from other sites'
bundles, not licensed open source with its license intact.

## 2026-10-09 — Ink Hero: three stations, one trigger, one surface
Paper (h=0) → wash (h=0.5) → print (h=1), each leg on the chosen curve (default
`ink`), text reveals on `expo.out`. A static 400vh section with a sticky stage,
one ScrollTrigger publishing h, every effect a window of h through quick
setters, one WebGL2 canvas rendered only from scroll updates. Rejected: a
ScrollTrigger pin (spacer + ordering constraints the sticky stage avoids);
SplitText for the headline (the lines are authored, so hand-rolled masks keep
the text intact for assistive tech and copy; SplitText stays for wrapped
paragraphs); CSS `clip-path` for the frame (the shader draws the frame edge for
free and can brush it); a free rAF loop for the canvas.

## 2026-10-09 — Dispose never forces WebGL context loss
The first build called `WEBGL_lose_context.loseContext()` on unmount. React
StrictMode mounts twice, so the second mount inherited a dead context: the
harness reported `[SHADER_ERROR] null` and a hidden canvas while the shader
compiled fine in isolation. Dispose now releases GPU objects only; init asks
for a restore if it meets a lost context and re-initializes on
`webglcontextrestored`. Lesson: a lifecycle bug reads exactly like a shader bug
until you compile the shader by itself.

## 2026-10-09 — Spec-authoring lessons from the first measured run
The hero scene's local progress equals h, so a key's `localProgress` is h, not
the page fraction (the first draft put the line-1 "revealed" key at h=0.6 and
the ease probe failed at 0.994). Measure sections, not vertically centered
children. Both were spec mistakes, not build defects; the harness made that
distinction cheap.

## 2026-10-09 — Two defects found in the stills, fixed in the shader
At the paper station nothing was developed, so the "small sheet on bare
paper" composition never appeared; the sheet now shows faintly (7% alpha,
fading as the image develops). At full bleed the brushed frame edge left a
ragged border at the viewport edges; the brush now scales with the inset and the
frame is exactly 1 at inset 0. Numbers first, looks second: both were invisible
to the spec and obvious in the contact sheet.

## 2026-10-09 — Verification record
Spec: 72/76 (2 warnings, 2 invariants the capture format cannot record).
Positive control: dead develop track → 5 failures. Jank at 120 Hz on Apple
M1 Pro: median 8.3 ms, p95 9.2, p99 9.3, worst 42.6, 0 long frames, 0.48%
dropped. analyze_frames: PASS. Probe: 0 shader errors, no context loss, no
console errors, reduced-motion page static with no animations. Unverified:
temporal feel, noise-scale aesthetics, mobile GPU thermals.

## 2026-10-09 — Live playground on Vercel, CLI-deployed
Ryan asked to see it. https://ease-atlas.vercel.app serves the built playground
(`vercel.json`: build `npm run build`, output `playground/dist`, no framework
preset). Deployed from the CLI with `--prod --yes` under ryanonline1234's scope;
not git-connected, so a change needs a manual redeploy. The per-deployment URL
is SSO-protected; the alias is public. Rejected: wiring the GitHub repo to
Vercel (every push would redeploy an unreviewed playground to a public URL).
