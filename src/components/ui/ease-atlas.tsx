/**
 * ease-atlas — a grid of named easing curves, each drawn as an SVG glyph with
 * a marker that rides the identical curve through a CSS `linear()` timing
 * function. One function feeds both, so the drawing and the motion cannot
 * disagree.
 *
 * Engine: cubic-bezier (CSS / easings.net), GSAP named eases (formulas read
 * from gsap-core.js), Penner names, CSS keywords, CustomEase-style SVG paths.
 * Arbitrary JavaScript is never evaluated.
 *
 * Source credits for the curves live on each ATLAS entry; curves marked
 * "observed" are timing constants read on the named site and are listed as
 * observed values, not as this project's own.
 *
 * MIT — https://github.com/ryanonline1234/ease-atlas
 */

export type EaseFn = (t: number) => number
export type EaseKind = 'bezier' | 'gsap' | 'penner' | 'keyword' | 'linear' | 'path' | 'code'

export interface ParsedEase {
  fn: EaseFn
  label: string
  kind: EaseKind
  /** Exact control points when the curve is a cubic bezier. */
  bezier?: [number, number, number, number]
  /** GSAP ease string when one is exactly equivalent. */
  gsap?: string
}

export type CopyFormat = 'css' | 'gsap' | 'token'
export type EaseFamily = 'reference' | 'out' | 'in' | 'in-out' | 'accent'

export interface AtlasEntry {
  name: string
  /** Canonical, parseable value. */
  value: string
  /** GSAP ease string when the entry is a named GSAP ease (or its bezier twin). */
  gsap?: string
  /** Who the curve comes from. "observed · site" marks a constant read on that site. */
  source: string
  family: EaseFamily
  note?: string
}

/* ----------------------------- engine ----------------------------------- */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 40; i++) {
      t = (lo + hi) / 2
      if (bx(t) < x) lo = t
      else hi = t
    }
    return by(t)
  }
}

function bounceOut(t: number): number {
  const n = 7.5625
  const d = 2.75
  if (t < 1 / d) return n * t * t
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
  return n * (t -= 2.625 / d) * t + 0.984375
}

// GSAP families, "in" direction. power1 = quad … power4 = quint (one degree
// higher than the classic name). expo.in is GSAP's blended form, which lands
// exactly on 0 and 1 (gsap-core.js: `(2 ** (10*(p-1))) * p + p**6 * (1-p)`).
const IN: Record<string, EaseFn> = {
  power0: (t) => t,
  power1: (t) => t * t,
  power2: (t) => t ** 3,
  power3: (t) => t ** 4,
  power4: (t) => t ** 5,
  sine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  expo: (t) => 2 ** (10 * (t - 1)) * t + t ** 6 * (1 - t),
  circ: (t) => 1 - Math.sqrt(1 - t * t),
  back: (t) => t * t * (2.70158 * t - 1.70158),
  elastic: (t) => (t === 0 || t === 1 ? t : -(2 ** (10 * (t - 1))) * Math.sin(((t - 1.075) * 2 * Math.PI) / 0.3)),
  bounce: (t) => 1 - bounceOut(1 - t),
}

const GSAP_FAMILY: Record<string, string> = {
  quad: 'power1',
  cubic: 'power2',
  quart: 'power3',
  quint: 'power4',
  strong: 'power4',
  sin: 'sine',
}
const familyOf = (name: string) => GSAP_FAMILY[name] ?? name

type Direction = 'in' | 'out' | 'inOut'
const variant = (fin: EaseFn, dir: Direction): EaseFn =>
  dir === 'in' ? fin : dir === 'out' ? (t) => 1 - fin(1 - t) : (t) => (t < 0.5 ? fin(2 * t) / 2 : 1 - fin(2 * (1 - t)) / 2)

const CSS_KEYWORDS: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}

// "M0,0 C x1,y1 x2,y2 x,y [x1,y1 x2,y2 x,y …]" — a chain of cubic segments in 0..1.
function svgPathEase(d: string): EaseFn | null {
  const nums = d.replace(/^M/, '').replace(/C/g, ' ').trim().split(/[\s,]+/).map(Number)
  if (nums.length < 8 || nums.some(Number.isNaN)) return null
  type Seg = { p0: [number, number]; p1: [number, number]; p2: [number, number]; p3: [number, number] }
  const segs: Seg[] = []
  let px = nums[0] as number
  let py = nums[1] as number
  for (let i = 2; i + 5 < nums.length; i += 6) {
    const [x1, y1, x2, y2, x, y] = nums.slice(i, i + 6) as [number, number, number, number, number, number]
    segs.push({ p0: [px, py], p1: [x1, y1], p2: [x2, y2], p3: [x, y] })
    px = x
    py = y
  }
  if (!segs.length) return null
  const at = (s: Seg, t: number, k: 0 | 1) =>
    (1 - t) ** 3 * s.p0[k] + 3 * (1 - t) ** 2 * t * s.p1[k] + 3 * (1 - t) * t * t * s.p2[k] + t ** 3 * s.p3[k]
  return (x) => {
    const s = segs.find((g) => x <= g.p3[0]) ?? (segs[segs.length - 1] as Seg)
    let lo = 0
    let hi = 1
    let t = 0.5
    for (let i = 0; i < 40; i++) {
      t = (lo + hi) / 2
      if (at(s, t, 0) < x) lo = t
      else hi = t
    }
    return at(s, t, 1)
  }
}

// GSAP's configurable eases, parameters kept.
function elasticOut(a = 1, p = 0.3): EaseFn {
  const p1 = Math.max(a, 1)
  const p2 = p / Math.min(a, 1)
  const p3 = (p2 / (2 * Math.PI)) * (Math.asin(1 / p1) || 0)
  return (t) => (t === 0 || t === 1 ? t : p1 * 2 ** (-10 * t) * Math.sin(((t - p3) * (2 * Math.PI)) / p2) + 1)
}
const backIn = (o = 1.70158): EaseFn => (t) => t * t * ((o + 1) * t - o)

const fmtNum = (n: number) => String(+n.toFixed(4))

/** Parse an easing written in any of the supported notations. Never evaluates code. */
export function parseEase(value: string): ParsedEase | null {
  const v = String(value ?? '')
  let m: RegExpMatchArray | null

  // `ease: "none"` / `ease: 'linear'` — a GSAP option, not the CSS keyword `ease`.
  if (/\bease\s*:\s*["'`]?(none|linear)\b/.test(v)) return { fn: (t) => t, label: 'linear', kind: 'linear', gsap: 'none' }

  m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
  if (m) {
    const b: [number, number, number, number] = [+m[1]!, +m[2]!, +m[3]!, +m[4]!]
    return { fn: cubicBezier(...b), label: `cubic-bezier(${b.map(fmtNum).join(', ')})`, kind: 'bezier', bezier: b }
  }

  m = v.match(/\belastic\.(inOut|in|out)\(\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (m) {
    const out = elasticOut(+m[2]!, m[3] ? +m[3] : 0.3)
    const label = m[0].replace(/\s+/g, '')
    return { fn: variant((t) => 1 - out(1 - t), m[1] as Direction), label, kind: 'gsap', gsap: label }
  }

  m = v.match(/\bback\.(inOut|in|out)\(\s*([\d.]+)\s*\)/)
  if (m) {
    const label = m[0].replace(/\s+/g, '')
    return { fn: variant(backIn(+m[2]!), m[1] as Direction), label, kind: 'gsap', gsap: label }
  }

  m = v.match(/\b(power[0-4]|expo|circ|sine|quad|cubic|quart|quint|strong|back|elastic|bounce)\.(inOut|in|out)\b/)
  if (m) {
    const fam = familyOf(m[1]!)
    const label = `${fam}.${m[2]}`
    return { fn: variant(IN[fam]!, m[2] as Direction), label, kind: 'gsap', gsap: label }
  }

  // Power curves written as code: 1-(1-t)^N, 1 - Math.pow(1 - t, N), t^N, Math.pow(t, N).
  m = v.match(/1\s*-\s*\(\s*1\s*-\s*t\s*\)\s*(?:\^|\*\*)\s*(\d+(?:\.\d+)?)|1\s*-\s*Math\.pow\(\s*1\s*-\s*t\s*,\s*(\d+(?:\.\d+)?)\s*\)/)
  if (m) {
    const k = +(m[1] ?? m[2]!)
    return { fn: (t) => 1 - (1 - t) ** k, label: `1-(1-t)^${k}`, kind: 'code' }
  }
  m = v.match(/(?:^|[^\w.])t\s*(?:\^|\*\*)\s*(\d+(?:\.\d+)?)|Math\.pow\(\s*t\s*,\s*(\d+(?:\.\d+)?)\s*\)/)
  if (m) {
    const k = +(m[1] ?? m[2]!)
    return { fn: (t) => t ** k, label: `t^${k}`, kind: 'code' }
  }

  m = v.match(/\bM0,0 C[\d.,\s-C]+/)
  if (m) {
    const fn = svgPathEase(m[0])
    if (fn) return { fn, label: 'custom path', kind: 'path' }
  }

  m = v.match(/\bease(In|Out|InOut)?(Quad|Cubic|Quart|Quint|Sine|Expo|Circ|Back|Elastic|Bounce)\b|\bease(Sin|Quad|Cubic|Quart|Quint|Expo|Circ)(In|Out|InOut)\b/)
  if (m) {
    const fam = familyOf((m[2] ?? m[3]!).toLowerCase())
    const dir = ((m[1] ?? m[4] ?? 'InOut').replace(/^./, (c) => c.toLowerCase())) as Direction
    return { fn: variant(IN[fam]!, dir), label: m[0], kind: 'penner', gsap: `${fam}.${dir}` }
  }

  m = v.match(/\b(ease-in-out|ease-out|ease-in|ease)\b(?!\s*[:=])/)
  if (m) {
    const b = CSS_KEYWORDS[m[1]!]!
    return { fn: cubicBezier(...b), label: m[1]!, kind: 'keyword', bezier: b }
  }

  if (/\b(linear|none)\b/.test(v)) return { fn: (t) => t, label: 'linear', kind: 'linear', gsap: 'none' }
  return null
}

/** The value range a curve covers: [0, 1] unless it overshoots (elastic, back). */
export function rangeOf(fn: EaseFn, n = 400): { lo: number; hi: number } {
  let lo = 0
  let hi = 1
  for (let i = 0; i <= n; i++) {
    const y = fn(i / n)
    if (y < lo) lo = y
    if (y > hi) hi = y
  }
  return { lo, hi }
}

/** The one sampler both outputs are built from. */
export function sampleStops(fn: EaseFn, n = 64): number[] {
  return Array.from({ length: n + 1 }, (_, i) => fn(i / n))
}

/** Worst gap between the polyline through n stops and the function, measured at the midpoints. */
function polylineError(fn: EaseFn, n: number): number {
  const stops = sampleStops(fn, n)
  let worst = 0
  for (let i = 0; i < n; i++) {
    const mid = ((stops[i] as number) + (stops[i + 1] as number)) / 2
    worst = Math.max(worst, Math.abs(mid - fn((i + 0.5) / n)))
  }
  return worst
}

/**
 * How many stops the glyph and the ride need so the polyline tracks the function
 * within `tolerance` (0.5% of the unit range by default). Smooth curves stay at
 * 64; bounce and elastic go denser.
 */
export function stopCountFor(fn: EaseFn, tolerance = 0.005, max = 512): number {
  for (let n = 64; n < max; n *= 2) if (polylineError(fn, n) <= tolerance) return n
  return max
}

export interface PathOptions {
  w?: number
  h?: number
  pad?: number
  n?: number
  lo?: number
  hi?: number
}

/** SVG path of the curve. y is mapped over [lo, hi] so an overshooting curve stays inside its plot. */
export function samplePath(fn: EaseFn, { w = 100, h = 100, pad = 8, n = 64, lo = 0, hi = 1 }: PathOptions = {}): string {
  const stops = sampleStops(fn, n)
  const pts = stops.map((y, i) => {
    const t = i / n
    return [pad + (w - 2 * pad) * t, h - pad - ((h - 2 * pad) * (y - lo)) / (hi - lo)] as const
  })
  return 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')
}

/** CSS `linear()` timing function sampled from the same stops the glyph is drawn from. */
export function cssLinear(fn: EaseFn, n = 64): string {
  return `linear(${sampleStops(fn, n)
    .map((v) => +v.toFixed(4))
    .join(', ')})`
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** The text a visitor gets when they copy an entry in a given format. */
export function toCopyText(entry: AtlasEntry, format: CopyFormat): string {
  const parsed = parseEase(entry.value)
  if (!parsed) return entry.value
  const css =
    parsed.kind === 'linear' ? 'linear' : parsed.bezier ? `cubic-bezier(${parsed.bezier.map(fmtNum).join(', ')})` : cssLinear(parsed.fn, stopCountFor(parsed.fn))
  if (format === 'css') return css
  if (format === 'token') return `--ease-${slugify(entry.name)}: ${css};`
  const gsap = entry.gsap ?? parsed.gsap
  if (gsap) return gsap
  if (parsed.bezier) return `CustomEase.create("${slugify(entry.name)}", "${parsed.bezier.map(fmtNum).join(', ')}")`
  return css
}

/* ----------------------------- the atlas -------------------------------- */

export const ATLAS: AtlasEntry[] = [
  { name: 'linear', value: 'linear', gsap: 'none', source: 'CSS keyword', family: 'reference', note: 'Marquees, progress bars, every scroll-scrubbed tween. Never for UI movement.' },
  { name: 'ease', value: 'ease', source: 'CSS keyword · the browser default', family: 'reference', note: 'cubic-bezier(0.25, 0.1, 0.25, 1). Too weak to read as designed; the signature of unconsidered code.' },
  { name: 'power1.out', value: 'cubic-bezier(0.5, 1, 0.89, 1)', gsap: 'power1.out', source: 'easings.net easeOutQuad', family: 'out', note: 'GSAP’s default ease. Barely eased; micro-motion under 150 ms.' },
  { name: 'power2.out', value: 'cubic-bezier(0.33, 1, 0.68, 1)', gsap: 'power2.out', source: 'easings.net easeOutCubic', family: 'out', note: 'The workhorse: hovers, small transforms, per-character swaps.' },
  { name: 'power3.out', value: 'cubic-bezier(0.25, 1, 0.5, 1)', gsap: 'power3.out', source: 'easings.net easeOutQuart', family: 'out', note: 'Confident, unfussy. Section reveals, card grids, staggered lists.' },
  { name: 'power4.out', value: 'cubic-bezier(0.22, 1, 0.36, 1)', gsap: 'power4.out', source: 'easings.net easeOutQuint', family: 'out', note: 'The premium entrance default, shipped by enough award sites to be a tell. Vary it.' },
  { name: 'expo.out', value: 'cubic-bezier(0.16, 1, 0.3, 1)', gsap: 'expo.out', source: 'easings.net easeOutExpo', family: 'out', note: 'Violent launch, long settle. Hero reveals, page wipes, big text entrances.' },
  { name: 'expo.in', value: 'cubic-bezier(0.7, 0, 0.84, 0)', gsap: 'expo.in', source: 'easings.net easeInExpo', family: 'in', note: 'Exits only. An ease-in on an entrance delays the moment the user is already watching.' },
  { name: 'power2.inOut', value: 'cubic-bezier(0.65, 0, 0.35, 1)', gsap: 'power2.inOut', source: 'easings.net easeInOutCubic', family: 'in-out', note: 'Elements already on screen changing place or size.' },
  { name: 'expo.inOut', value: 'cubic-bezier(0.87, 0, 0.13, 1)', gsap: 'expo.inOut', source: 'easings.net easeInOutExpo', family: 'in-out', note: 'Slow-fast-slow with a decisive middle. Large surfaces, full-page moves.' },
  { name: 'ease-out (Emil)', value: 'cubic-bezier(0.23, 1, 0.32, 1)', source: 'Emil Kowalski', family: 'out', note: 'Between quint and expo. His blanket UI default: built-in CSS easings are too weak.' },
  { name: 'ease-in-out (Emil)', value: 'cubic-bezier(0.77, 0, 0.175, 1)', source: 'Emil Kowalski', family: 'in-out', note: 'Moving or morphing on screen.' },
  { name: 'drawer', value: 'cubic-bezier(0.32, 0.72, 0, 1)', source: 'Vaul · Emil Kowalski', family: 'out', note: 'Grabs immediately, glides to a dead stop. Sheets, drawers, side panels.' },
  { name: 'osmo', value: 'cubic-bezier(0.625, 0.05, 0, 1)', source: 'observed · osmo.supply', family: 'in-out', note: 'Dips below linear at the start, then a near-vertical finish. Masked text reveals.' },
  { name: 'lusion', value: 'cubic-bezier(0.35, 0, 0, 1)', source: 'observed · lusion.co', family: 'in-out', note: 'In-out with an abrupt terminal snap, site-wide for DOM and canvas.' },
  { name: 'ink', value: 'cubic-bezier(0.7, 0, 0.2, 1)', source: 'observed · oneshot-sakura.vercel.app', family: 'in-out', note: 'Weighted in-out; that site’s only interactive-transition ease.' },
  { name: 'm3.standard', value: 'cubic-bezier(0.2, 0, 0, 1)', source: 'Material 3', family: 'in-out', note: 'Restrained product-UI register.' },
  { name: 'm3.decelerate', value: 'cubic-bezier(0.05, 0.7, 0.1, 1)', source: 'Material 3 emphasized', family: 'out', note: 'Enters fast, settles long.' },
  { name: 'm3.accelerate', value: 'cubic-bezier(0.3, 0, 0.8, 0.15)', source: 'Material 3 emphasized', family: 'in', note: 'Leaves fast.' },
  { name: 'carbon.productive', value: 'cubic-bezier(0.2, 0, 0.38, 0.9)', source: 'IBM Carbon standard', family: 'in-out', note: 'Efficient, unemotional. Motion within the viewport.' },
  { name: 'carbon.expressive', value: 'cubic-bezier(0.4, 0.14, 0.3, 1)', source: 'IBM Carbon standard', family: 'in-out', note: 'Same job, more character.' },
  { name: 'back.out', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', gsap: 'back.out(1.7)', source: 'easings.net easeOutBack', family: 'accent', note: 'Overshoots then settles. Stamps, badges, pops. Never on text the user must read on arrival.' },
  { name: 'elastic.out', value: 'elastic.out(1, 0.3)', gsap: 'elastic.out(1, 0.3)', source: 'GSAP · amplitude 1, period 0.3', family: 'accent', note: 'Not a bezier: only linear() can carry it in CSS.' },
  { name: 'bounce.out', value: 'bounce.out', gsap: 'bounce.out', source: 'GSAP', family: 'accent', note: 'Not a bezier: only linear() can carry it in CSS.' },
]

/* ----------------------------- component -------------------------------- */

import * as React from 'react'

/** Inset of the plot inside the glyph box, in % of the box. The SVG path and the ride use the same value. */
const PAD = 8
/** The ride fills the first two thirds of each cycle; the last third is the settle. */
const RIDE = 2 / 3

const FORMATS: { id: CopyFormat; label: string }[] = [
  { id: 'css', label: 'CSS' },
  { id: 'gsap', label: 'GSAP' },
  { id: 'token', label: 'Token' },
]
const formatLabel = (f: CopyFormat) => FORMATS.find((x) => x.id === f)?.label ?? f

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (!mq) return
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])
  return reduced
}

export interface EaseAtlasProps {
  curves?: AtlasEntry[]
  /** Columns at full width; the grid drops columns on narrow containers. */
  columns?: number
  /** Ride duration in ms. The viewer is watching, not waiting: 600–1200 reads right. */
  duration?: number
  /** Loop every curve continuously instead of riding on hover/focus. */
  autoplay?: boolean
  /** Show a faint marker riding the diagonal (linear) for comparison. */
  showGhost?: boolean
  /** Print the CSS value under each curve instead of its source. */
  showCode?: boolean
  /** Initial copy format. */
  format?: CopyFormat
  onCopy?: (entry: AtlasEntry, text: string) => void
  className?: string
}

export default function EaseAtlas({
  curves = ATLAS,
  columns = 4,
  duration = 1200,
  autoplay = false,
  showGhost = true,
  showCode = false,
  format: initialFormat = 'css',
  onCopy,
  className,
}: EaseAtlasProps) {
  const [format, setFormat] = React.useState<CopyFormat>(initialFormat)
  React.useEffect(() => setFormat(initialFormat), [initialFormat])
  const reduced = useReducedMotion()
  const [announce, setAnnounce] = React.useState('')

  const copy = React.useCallback(
    async (entry: AtlasEntry) => {
      const text = toCopyText(entry, format)
      try {
        await navigator.clipboard?.writeText(text)
      } catch {
        /* clipboard unavailable (insecure context, denied); the onCopy consumer still gets the text */
      }
      onCopy?.(entry, text)
      setAnnounce(`Copied ${entry.name} as ${formatLabel(format)}: ${text}`)
    },
    [format, onCopy],
  )

  const onRadioKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const nextIndex = (i + delta + FORMATS.length) % FORMATS.length
    setFormat(FORMATS[nextIndex]!.id)
    ;(e.currentTarget.parentElement?.children[nextIndex] as HTMLElement | undefined)?.focus()
  }

  const gap = 12
  const minCell = 120

  return (
    <div className={cn('w-full text-foreground', className)}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Copy format" className="inline-flex rounded-md border border-border bg-card p-0.5">
          {FORMATS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              tabIndex={format === f.id ? 0 : -1}
              onClick={() => setFormat(f.id)}
              onKeyDown={(e) => onRadioKey(e, i)}
              className={cn(
                'rounded-[5px] px-2.5 py-1 font-mono text-[11px] leading-5 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                format === f.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {autoplay ? 'Click a curve to copy it.' : 'Hover or focus a curve to ride it. Click to copy.'}
        </p>
      </div>

      <div
        className="grid"
        style={{
          gap,
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, max(${minCell}px, calc(${100 / Math.max(1, columns)}% - ${gap}px))), 1fr))`,
        }}
      >
        {curves.map((entry) => (
          <Cell
            key={entry.name}
            entry={entry}
            format={format}
            duration={duration}
            autoplay={autoplay}
            showGhost={showGhost}
            showCode={showCode}
            reduced={reduced}
            onCopy={copy}
          />
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  )
}

interface CellProps {
  entry: AtlasEntry
  format: CopyFormat
  duration: number
  autoplay: boolean
  showGhost: boolean
  showCode: boolean
  reduced: boolean
  onCopy: (entry: AtlasEntry) => Promise<void>
}

function Cell({ entry, format, duration, autoplay, showGhost, showCode, reduced, onCopy }: CellProps) {
  const geom = React.useMemo(() => {
    const parsed = parseEase(entry.value)
    if (!parsed) return null
    const { lo, hi } = rangeOf(parsed.fn)
    const n = stopCountFor(parsed.fn)
    // y position of a value, in % of the plot height, measured from the top.
    const yAt = (v: number) => `translateY(${(((hi - v) / (hi - lo)) * 100).toFixed(4)}%)`
    return {
      lo,
      hi,
      // Same n for both: the drawn polyline and the ridden linear() share every stop.
      path: samplePath(parsed.fn, { w: 100, h: 100, pad: PAD, n, lo, hi }),
      timing: cssLinear(parsed.fn, n),
      css: toCopyText(entry, 'css'),
      yStart: yAt(0),
      yEnd: yAt(1),
      level: (v: number) => 100 - PAD - ((100 - 2 * PAD) * (v - lo)) / (hi - lo),
    }
  }, [entry])

  const xRef = React.useRef<HTMLSpanElement>(null)
  const yRef = React.useRef<HTMLSpanElement>(null)
  const ghostRef = React.useRef<HTMLSpanElement>(null)
  const anims = React.useRef<Animation[]>([])
  const [copied, setCopied] = React.useState(false)
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = React.useCallback(() => {
    for (const a of anims.current) a.cancel()
    anims.current = []
  }, [])

  const play = React.useCallback(
    (loop: boolean) => {
      const x = xRef.current
      const y = yRef.current
      if (reduced || !geom || !x || !y || typeof x.animate !== 'function') return
      stop()
      const timing: KeyframeAnimationOptions = { duration: duration / RIDE, iterations: loop ? Infinity : 1, fill: 'forwards' }
      anims.current.push(
        x.animate(
          [{ transform: 'translateX(0%)' }, { transform: 'translateX(100%)', offset: RIDE }, { transform: 'translateX(100%)' }],
          { ...timing, easing: 'linear' },
        ),
        // The first keyframe's easing is the sampled function itself: the marker's
        // vertical motion through the plot IS the curve, not a drawing of it.
        y.animate(
          [{ transform: geom.yStart, easing: geom.timing }, { transform: geom.yEnd, offset: RIDE, easing: 'linear' }, { transform: geom.yEnd }],
          timing,
        ),
      )
      const g = ghostRef.current
      if (g && showGhost) {
        anims.current.push(
          g.animate([{ transform: geom.yStart }, { transform: geom.yEnd, offset: RIDE }, { transform: geom.yEnd }], { ...timing, easing: 'linear' }),
        )
      }
    },
    [reduced, geom, duration, showGhost, stop],
  )

  React.useEffect(() => {
    if (autoplay) play(true)
    else stop()
    return stop
  }, [autoplay, play, stop])

  React.useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )

  const ride = () => {
    if (!autoplay) play(false)
  }
  const handleClick = async () => {
    await onCopy(entry)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1400)
  }

  const overshoot = !!geom && (geom.lo < 0 || geom.hi > 1)
  const restX = reduced ? 'translateX(100%)' : 'translateX(0%)'
  const restY = geom ? (reduced ? geom.yEnd : geom.yStart) : undefined

  return (
    <button
      type="button"
      aria-label={`Copy ${entry.name} as ${formatLabel(format)}`}
      title={entry.note}
      onPointerEnter={ride}
      onFocus={ride}
      onClick={handleClick}
      className={cn(
        'group relative flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left text-card-foreground',
        'transition-colors duration-150 hover:border-foreground/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-xs font-medium">{entry.name}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{entry.family}</span>
      </span>

      <span className="relative block aspect-square w-full">
        <svg viewBox="0 0 100 100" className="block h-full w-full overflow-visible text-primary" aria-hidden="true">
          {/* the plot frame and the linear diagonal, for reference */}
          <rect x={PAD} y={PAD} width={100 - 2 * PAD} height={100 - 2 * PAD} fill="none" stroke="currentColor" strokeOpacity={0.12} vectorEffect="non-scaling-stroke" />
          <line x1={PAD} y1={100 - PAD} x2={100 - PAD} y2={PAD} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          {overshoot && geom && (
            <>
              <line x1={PAD} y1={geom.level(1)} x2={100 - PAD} y2={geom.level(1)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="1 2" vectorEffect="non-scaling-stroke" />
              <line x1={PAD} y1={geom.level(0)} x2={100 - PAD} y2={geom.level(0)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="1 2" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {geom && (
            <path d={geom.path} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {geom && (
          <span
            ref={xRef}
            data-ride="x"
            aria-hidden="true"
            className="pointer-events-none absolute block"
            style={{ left: `${PAD}%`, top: `${PAD}%`, width: `${100 - 2 * PAD}%`, height: `${100 - 2 * PAD}%`, transform: restX }}
          >
            {showGhost && !reduced && (
              <span ref={ghostRef} data-ride="ghost" className="absolute left-0 top-0 block h-full w-full" style={{ transform: restY }}>
                <span className="absolute -left-[3px] -top-[3px] block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              </span>
            )}
            <span ref={yRef} data-ride="y" className="absolute left-0 top-0 block h-full w-full" style={{ transform: restY }}>
              <span className="absolute -left-1 -top-1 block h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            </span>
          </span>
        )}
      </span>

      <span className="block min-h-5 text-[11px] leading-5 text-muted-foreground">
        {copied ? (
          <span className="text-foreground">Copied {formatLabel(format)}</span>
        ) : showCode && geom ? (
          <span className="block truncate font-mono">{geom.css}</span>
        ) : (
          <span className="block truncate">{entry.source}</span>
        )}
      </span>
    </button>
  )
}
