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
