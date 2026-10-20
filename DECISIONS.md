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

## 2026-10-09 — Ink, not fog: the front retuned, plus four add-ons
Ryan: finer islands if it reads like fog. It did: large soft clouds. Now
`noiseScale` 5 (was 3), `feather` 0.12 (was 0.18), a fine speckle term on the
front so the edge breaks into droplets, a thinner and darker ink band, and a
thin dark rim right at the front where ink pools as it dries. Stills at the
wash station read as blots on a sheet. Add-ons from the review pass: a fine
pointer develops the print locally where it rests (one render per move, no
loop; off on coarse pointers and under reduced motion); the station rail is
real buttons that scroll to each station (`scrollTo` prop so a Lenis page can
route it); `inkColor` and `onStation` props; OG image, description and favicon
on the playground so a shared link previews the print. Rejected: a
velocity-coupled feather (a second interaction on one piece) and an in-shader
blur (paint cost, and ink does not blur).

## 2026-10-09 — Published to 21st.dev, both components, covers supplied
Ryan reviewed the live site and said publish both. Published from the CLI
drafts: ink-hero (component 20923) and ease-atlas (component 20924), then
`21st submit` for each → "in review". Until Featured, a published component is
reachable by link and on the profile but not in the catalog; the listing shows
as "unlisted" meanwhile. The registry's automatic cover capture refused the
demo once over an off-origin playground link; covers were supplied from the
harness stills instead (`.21st-review/*.jpg`, gitignored), which also give the
card the print station rather than the paper station. Day-zero metrics
captured (`metrics/2026-10-10.json`, UTC date): zeros everywhere, as expected;
the per-component view counters are not in a fresh page's payload, so
`scripts/capture-metrics.mjs` records what is present and the parser gets
revisited at the first monthly capture. Gates now running: K2 (30 days after
submit), K3 (60 days after the third Featured), K4 (90 days).

## 2026-10-13 — Ink Hero Featured; Ease Atlas not pursued
`21st components --json` on 2026-10-13: ink-hero (20923) `public`, `featured`;
ease-atlas (20924) `unlisted`, `needs_changes`. Ryan: "I'm okay with moving on
from" Ease Atlas, so it is not resubmitted and counts as a non-Featured slot in
K2. K2 is now 1 of 5; the remaining slots are InkReveal, MaskReveal and
ScrollScore, and K2 needs two of those three Featured within 30 days of the
last submit. K3 and K4 clocks start at the third Featured, not the first. The
pause rule tied to Hack Club Terra applies from 2026-10-19, when Terra starts.

## 2026-10-13 — Cold install found two breaking defects and one silent one
Installed the exact published file the way the registry places it into a fresh
Next.js 16 App Router project with shadcn and a fresh Vite 8 project with plain
Tailwind v4 (file-level, not via `21st add`, so no daily retrieval was spent and
no self-install was added to the CLI counter). Found:
1. Next.js build failed (`c.useRef is not a function`): no `'use client'`.
   Every App Router install broke. Fixed; a unit test pins the first line.
2. Vite build failed: its default tsconfig has `erasableSyntaxOnly`, which
   rejects TypeScript parameter properties in the WebGL class. Fixed with plain
   fields; the repo's tsconfig now enables `erasableSyntaxOnly` too.
3. Without shadcn tokens the section background is transparent, which resolved
   the shader's paper to black. Transparent colors now walk up to the nearest
   ancestor background, else white; unit-tested.
The registry already declares `gsap` and `@gsap/react`, and a logged-out
`21st add` points strangers at `$API_KEY_21ST`, so the API key is the first
step for every stranger. Neither is fixable in the file; both are in the README.

## 2026-10-13 — Image CORS: fall back visibly; keep both requests CORS-mode
The old code failed silently when an image host sent no CORS headers: the
texture never loaded and the crossorigin `<img>` fallback failed too, leaving a
blank hero. Now a texture failure logs one warning and shows the image with the
clip-path frame. First attempt dropped `crossOrigin` from the visible `<img>`;
the cold test then showed the 21st.dev CDN only sends
`Access-Control-Allow-Origin` to requests that carry an Origin and serves the
plain response without `Vary`, so Chromium cached the plain response and the
texture request reused it and failed. The visible `<img>` now stays CORS-mode
and drops the attribute only after a texture failure, which makes the browser
refetch it plainly. Probe tests the fallback against a real second origin;
Playwright's `route.fulfill` bypasses CORS and cannot stand in for a bad host.
Positive control: reintroducing the old attribute fails that test.

## 2026-10-13 — No-image mode: procedural ink ridges
Omitting `image` now develops three fbm ridges, far to near, ink thinning
toward each foot. Removes the image as a required asset and makes the hero a
text-first option. Rejected: a flat ink field or gradient (reads as a
placeholder, not as the same piece).

## 2026-10-13 — Revision drafted, held for Ryan
The fixes and a search-led description (261 of 280 characters: "Scroll image
reveal hero: a WebGL ink dissolve (sumi-e) …", ending with the install
command) are in CLI Review draft 48e12df1-8efe-486f-b72a-b50e2d67e20c for
component 20923. Not published: the docs do not say whether publishing a
revision keeps Featured status, and Featured is the K2 asset. Rejected from the
advice: putting Next.js and Vite notes in the description (280-character limit;
they live in the file header and README instead); moving the demo image (the
registry already mirrors it to its CDN); fixing the metrics parser (it was
correct; a fresh page simply had no counts).

## 2026-10-19 — InkReveal: zero dependencies, one shared WebGL context
Ryan: "Go ahead with ink reveal." The dissolve as a standalone image card that
develops on hover (blooming from the pointer's entry point), on scroll into
view, or from a controlled `progress`. Design choices:
- React only. A 30-line rAF tween replaces GSAP; fewer dependencies, fewer
  failed installs. A unit test pins the import list to `react`.
- One WebGL2 context for every card on the page: a detached shared canvas
  renders each card into its top-left W×H and the card copies that rectangle
  into its own 2D canvas. Chrome drops the oldest context past about 16, and a
  gallery is the main use case. Positive control: per-card contexts measured 8
  contexts for 4 cards under React's dev double-mount; the shared surface, 1.
- At rest the card holds a faint desaturated ghost (`rest` 0.2), not a blank.
- Devices that cannot hover get the inView behaviour; keyboard focus on a
  wrapping link or button develops the card; reduced motion shows the plain
  image and creates no context; a CORS-less host falls back to the plain image
  with the request-mode rule from InkHero.
Rejected: one fixed full-page canvas drawing every card at its DOM rect (scroll
sync and stacking problems); an SVG feTurbulence filter (recomputes noise on
the CPU every frame); per-card contexts.

## 2026-10-19 — InkReveal look: ink, not a burn hole
The first front was one central blob with a heavy black rim, which read as a
cigarette burn. Now the field leans less on the seed (0.4 instead of 0.55) so
islands appear across the card, the tide line carries the image's own tone
into the ink (band 0.42), the rim darkens by 0.22 instead of 0.4, and islands
are finer (noiseScale 5).

## 2026-10-19 — Harness lessons from this build
- `every()` over an empty list is true. Two capture waits passed before the
  lazily loaded demo mounted and saved blank frames; every readiness check now
  requires all four cards to exist.
- A 42-minute "timeout" was the Mac asleep with the lid closed (power log,
  17:30–17:58). Check the power log before suspecting code.
- Vite reloads the page when it discovers a dependency mid-session, which a
  probe sees as the component vanishing. `optimizeDeps.include` now pins every
  runtime dependency.
- A hover sampling loop that stops within 0.001 of the target cannot then
  assert within 0.0005; it now waits for the exact landing.

## 2026-10-19 — Registry login expired
`21st components` returns HTTP 401 "Invalid API key" for the saved login. Ryan
re-runs `21st login`. Until then no draft, publish, or submit is possible; the
InkReveal cover (`.21st-review/ink-reveal-cover.jpg`, four develop stages
composited) and description are ready.
Update, same day: the login worked again a few hours later; the InkReveal draft
(322ae250) was prepared with the composited cover and is held for Ryan's review.

## 2026-10-19 — Freeze what is live on 21st.dev; only InkReveal goes up
Ryan: "don't revise ink hero since it puts it back into review, if you
republish/update on 21stdev, only ink reveal no longer tamper with what we have
out there." InkHero (Featured) and EaseAtlas (needs_changes) are frozen on the
registry: no revision, metadata edit, resubmit, withdraw, or delete. This
supersedes the 2026-10-13 plan to publish the InkHero revision on October 19.
Draft 48e12df1 is left unpublished. The registry copy of InkHero keeps its known
gaps (no 'use client', Vite erasableSyntaxOnly, transparent-paper color, silent
blank on CORS-less images); the README now says the registry copy is the
original release and points Next.js users to add 'use client' or take the
repo's file.

## 2026-10-20 — Why the InkReveal draft showed a counter and had no video
Ryan opened the draft and saw a starter counter, and no video. Two causes found
in 21st's pipeline, read from the CLI source and its server responses:
1. The CLI rewrites a demo's import to wherever its build puts the component,
   but only for relative imports or `@/components/ui/component`. The demo used
   `@/components/ui/ink-reveal`, which only matches when the build slug equals
   the file name; `21st render` uses a suffixed slug and failed to compile. The
   demo now imports `../../components/ui/ink-reveal`, which works locally and
   gets rewritten everywhere. Whether this alone explains the counter in Studio
   is unverified; it needs Ryan's signed-in view.
2. 21st's capture sandbox blocks every outside host ("Capture request left its
   allowed origin"), so a demo that loads Wikimedia images cannot get a
   generated cover or video before publishing. Images are copied to
   cdn.21st.dev only at publish, which is how InkHero got its video later.
   Correction to 2026-10-09: InkHero's auto-cover failed for this reason, not
   because of the playground link.
Also: the video generator only accepts a clip when a click, key press, typing
or scroll changes what is visible, and hover is none of those. There is no CLI
flag to attach a component video, and `21st profile upload` needs a secret API
key. So the video is recorded here (`.21st-review/ink-reveal-demo.mp4`, 10 s,
1280×720, the pointer entering each card from a different side) for Ryan to add
in the review screen, along with the staged cover. Rejected: inlining the four
images as data URIs to satisfy the sandbox (a 200 KB wall of base64 in every
visitor's copied code).

## 2026-10-20 — InkRidges: the fourth component
Ryan: "yes make ink ridges the fourth component." A procedural sumi-e range
as a background with children on top. Far-to-near layer geometry, a staggered
left-to-right brush paint-in on the ink curve, drifting mist, damped pointer
parallax, a sun disc, and a "paint another range" seed change. React only, no
images, so 21st's capture sandbox can render it (unlike InkReveal's demo).
- Frame budget: the loop runs only while painting, drifting, or settling, and
  only while visible and the tab is shown. Positive control: forcing the loop
  on drew 11 frames where the component draws 0.
- First real-GPU measurement was borderline (0.95% dropped at 120 Hz, 3 long
  frames). Skipping all noise work above each ridge line and using 3-octave
  fbm for mist, brush texture and brush edge brought it to 0.29% at pixel
  ratio 1 and 0.79% at 2, with at most 1 long frame.
- Look: feet dissolve into mist sooner (the ridge line keeps full ink), and ink
  eases to 62–100% on dark paper so the dark theme reads as moonlight instead
  of glare.
Rejected: precomputing ridge heights on the CPU into a 1D texture (more code
than the early-out it would beat); a "breathing" animated ridge line (mountains
moving reads wrong; only the mist moves).

## 2026-10-20 — Registry media: supply covers and videos ourselves
InkRidges loads no images, and 21st's capture did generate its cover, but the
video stayed "skipped" for it too, so the skip is not only the image sandbox;
the reason is undocumented. Its generated cover was also unusable after the
demo's wrapper got `w-full` (a zoomed crop with no headline or sun, identical
on a second regeneration), while before that fix the range sat in the middle
60% because 21st centers demos in a flex container and the wrapper shrank to
its text. Covers for both components are captured here at 4:3 (InkRidges at a
1280×1171 viewport so the 82svh landscape is exactly 4:3) and videos are
recorded here; Ryan uploads them in the review screen. The review screen itself
never rendered in Claude's browser pane (stuck on its skeleton; the network log
showed it loading the draft's own demo file), so whether the starter counter
Ryan saw is gone is unverified.
