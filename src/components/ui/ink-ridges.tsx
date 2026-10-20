'use client'

/**
 * ink-ridges — a sumi-e mountain range painted in front of you. Layered ridges,
 * far to near, each laid down with a brush sweep; ink thins toward every foot
 * and mist drifts between them. Every seed paints a different range. Use it as
 * a hero or section background: children render on top.
 *
 * Install
 *   npx @21st-dev/cli add @ryanonline1234/ink-ridges   (needs a free 21st.dev API key)
 *   React 19 and nothing else. Tailwind v4 for a few utility classes. The paper
 *   is the nearest background behind it (else white) and the ink is the text
 *   color, so it follows light and dark themes with no configuration.
 *
 * Frame budget
 *   It draws only while something moves: the paint-in, drifting mist, or the
 *   pointer settling. Offscreen, in a hidden tab, or with drift and parallax at
 *   0 it draws nothing. prefers-reduced-motion shows the finished landscape as
 *   one static frame.
 *
 * Frameworks
 *   Next.js App Router: a Client Component ('use client' above). Vite: nothing extra.
 *
 * Provenance: the GLSL is authored here from first principles (integer hash,
 * value noise, fbm, a ridged term for sharper peaks). The brush curve is the
 * ink cubic-bezier(0.7, 0, 0.2, 1), observed on oneshot-sakura.vercel.app.
 * MIT — https://github.com/ryanonline1234/ease-atlas
 */

import * as React from 'react'

/* ----------------------------- pure parts ------------------------------- */

type RGB = [number, number, number]
const MAX_LAYERS = 5
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

export interface Layer {
  /** Ridge-line height, 0 bottom to 1 top. */
  base: number
  /** How far the ridge line rises and falls around its base. */
  amp: number
  /** Horizontal frequency of the peaks. */
  freq: number
  /** Ink density at the ridge line. */
  ink: number
  /** 0 for the farthest ridge, 1 for the nearest. */
  depth: number
}

/** Ridge i of n: the far ridge sits at the horizon; nearer ridges are lower, taller, busier and darker. */
export function layerAt(i: number, n: number, horizon: number): Layer {
  const depth = n <= 1 ? 1 : i / (n - 1)
  const h = Math.min(0.82, Math.max(0.3, horizon))
  return {
    base: n <= 1 ? h : h - (h - 0.2) * depth,
    amp: 0.07 + 0.06 * depth,
    freq: 1.3 + 1.9 * depth,
    ink: 0.22 + 0.5 * depth,
    depth,
  }
}

/** How far ridge i of n has been brushed in at overall progress p. The far ridge starts first. */
export function paintAt(p: number, i: number, n: number): number {
  if (n <= 1) return clamp01(p)
  const stagger = Math.min(0.18, 0.6 / (n - 1))
  const span = 1 - stagger * (n - 1)
  return clamp01((p - i * stagger) / span)
}

/** Ink density for a paper color: full on light paper, eased off on dark paper so light ink reads as moonlight. */
export function inkScaleFor(paper: [number, number, number]): number {
  const lum = 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2]
  return lum < 0.35 ? 0.62 + (lum / 0.35) * 0.38 : 1
}

/** Exponential smoothing that behaves the same at 60 Hz and 120 Hz. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt)
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
  return (x: number) => {
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
const ink = cubicBezier(0.7, 0, 0.2, 1) // observed · oneshot-sakura.vercel.app

/** #rgb, #rrggbb, rgb(), rgba() → unit floats; null for transparent and for formats that need a browser. */
export function colorToRgb(css: string): RGB | null {
  const s = css.trim()
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const hex = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB
  }
  if (/^transparent$/i.test(s)) return null
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)/i)
  if (m) {
    if (m[4] !== undefined && Number(m[4]) === 0) return null
    return [+m[1]! / 255, +m[2]! / 255, +m[3]! / 255]
  }
  return null
}

function resolveCssColor(v: string): RGB | null {
  const direct = colorToRgb(v)
  if (direct) return direct
  if (/^transparent$/i.test(v.trim()) || /^rgba?\([^)]*[,/]\s*0\s*\)$/i.test(v.trim())) return null
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#000'
    ctx.fillStyle = v
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    if (d[3] === 0) return null
    return [d[0]! / 255, d[1]! / 255, d[2]! / 255]
  } catch {
    return null
  }
}

/** The element's own color, or for a transparent background the nearest ancestor's, else a default. */
function resolveColor(el: Element, prop: 'color' | 'backgroundColor'): RGB {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const rgb = resolveCssColor(getComputedStyle(n)[prop])
    if (rgb) return rgb
    if (prop === 'color') break
  }
  return prop === 'color' ? [0.1, 0.1, 0.1] : [1, 1, 1]
}

/* ----------------------------- shader ----------------------------------- */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Authored here. Each ridge line is fbm plus a ridged term for sharper peaks;
// below it, ink thins toward the foot and is broken by brush texture; drifting
// low-frequency fbm lifts mist out of each foot; a ragged left-to-right sweep
// lays each ridge down. A soft sun disc sits behind the far ridge. Grain on top.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uMist;
uniform float uDrift;
uniform float uGrain;
uniform int uLayers;
uniform vec4 uLayer[5];
uniform float uPaint[5];
uniform float uPaintAll;
uniform vec2 uShift;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSunColor;
uniform vec4 uSun;
uniform float uInkScale;

uint hashU(uvec2 p) {
  uint n = p.x * 1664525u ^ (p.y * 22695477u + 12345u);
  n ^= n >> 15u; n *= 2246822519u;
  n ^= n >> 13u; n *= 3266489917u;
  n ^= n >> 16u;
  return n;
}
float hash2(vec2 p) {
  ivec2 ip = ivec2(floor(p)) + 32768;
  return float(hashU(uvec2(ip))) / 4294967295.0;
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
// three octaves, rescaled to the same range: enough for mist, brush texture and the brush edge
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v / 0.875 * 0.96875;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 col = uPaper;

  if (uSun.w > 0.5) {
    float d = length((uv - uSun.xy) * vec2(aspect, 1.0));
    float disc = 1.0 - smoothstep(uSun.z - 0.004, uSun.z + 0.004, d);
    col = mix(col, uSunColor, disc * 0.85 * smoothstep(0.0, 0.3, uPaintAll));
  }

  for (int i = 0; i < 5; i++) {
    if (i >= uLayers) break;
    vec4 L = uLayer[i];
    float fi = float(i);
    float depth = uLayers > 1 ? fi / float(uLayers - 1) : 1.0;
    vec2 p = uv + uShift * (0.25 + depth);
    float x = p.x * aspect;
    float n = fbm(vec2(x * L.z + uSeed * 1.37 + fi * 7.31, fi * 3.7 + uSeed * 0.71));
    float ridged = 1.0 - abs(2.0 * vnoise(vec2(x * L.z * 2.3 + fi * 5.1 + uSeed, fi + uSeed * 0.3)) - 1.0);
    float h = L.x + L.y * ((n - 0.5) * 2.0 + (ridged - 0.5) * 0.35);

    float bleed = 0.0025 + 0.004 * vnoise(vec2(x * 40.0, fi * 9.0));
    float below = smoothstep(h + bleed, h - bleed, p.y);
    if (below <= 0.0) continue; // above this ridge line: no ink from it, skip the expensive part
    float fall = clamp((h - p.y) / (0.12 + 0.08 * depth), 0.0, 1.0);
    float tex = fbm3(vec2(x * 18.0, p.y * 22.0) + fi * 4.0 + uSeed);
    float dens = L.w * uInkScale * (1.0 - uMist * 0.95 * fall) * (0.82 + 0.36 * tex);
    float fog = smoothstep(0.42, 0.78, fbm3(vec2(x * 1.6 + uTime * uDrift * (0.4 + depth), p.y * 5.0 + fi * 2.0)));
    dens *= 1.0 - uMist * fog * fall * 0.9;

    float edge = mix(-0.2, 1.2, uPaint[i]) + (fbm3(vec2(p.y * 14.0, fi * 3.0 + uSeed)) - 0.5) * 0.18;
    float painted = 1.0 - smoothstep(edge - 0.035, edge + 0.035, uv.x);
    col = mix(col, uInk, clamp(below * dens * painted, 0.0, 1.0));
  }

  col += (hash2(uv * uResolution * 0.5) - 0.5) * uGrain * 0.1;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = ['uResolution', 'uTime', 'uSeed', 'uMist', 'uDrift', 'uGrain', 'uLayers', 'uLayer', 'uPaint', 'uPaintAll', 'uShift', 'uPaper', 'uInk', 'uSunColor', 'uSun', 'uInkScale'] as const

interface Frame {
  time: number
  seed: number
  mist: number
  drift: number
  grain: number
  layers: Layer[]
  paint: number[]
  paintAll: number
  shift: [number, number]
  paper: RGB
  ink: RGB
  sunColor: RGB
  sun: [number, number, number, number]
  /** Overall ink density: lighter ink on dark paper reads as moonlight, not glare. */
  inkScale: number
}

/** One quad, one program, no textures; renders on demand. */
class RidgesGL {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private loc = new Map<string, WebGLUniformLocation | null>()
  private lost = false
  private onRestore: () => void
  ok = false

  constructor(canvas: HTMLCanvasElement, onRestore: () => void) {
    this.canvas = canvas
    this.onRestore = onRestore
    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
    this.ok = this.init()
  }

  private handleLost = (e: Event) => {
    e.preventDefault() // required, or the browser never restores it
    this.lost = true
    this.ok = false
  }

  private handleRestored = () => {
    this.lost = false
    this.ok = this.init()
    if (this.ok) this.onRestore()
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' })
    if (!gl || gl.isContextLost()) return false
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh
      console.error('[ink-ridges] shader error', gl.getShaderInfoLog(sh))
      return null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ink-ridges] link error', gl.getProgramInfoLog(program))
      return false
    }
    gl.useProgram(program)
    gl.bindVertexArray(gl.createVertexArray())
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    this.loc.clear()
    for (const name of UNIFORMS) this.loc.set(name, gl.getUniformLocation(program, name))
    this.gl = gl
    this.program = program
    return true
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  draw(f: Frame) {
    const gl = this.gl
    if (!gl || !this.program || !this.ok || this.lost) return
    const W = this.canvas.width
    const H = this.canvas.height
    gl.viewport(0, 0, W, H)
    const L = (n: string) => this.loc.get(n)!
    gl.uniform2f(L('uResolution'), W, H)
    gl.uniform1f(L('uTime'), f.time)
    gl.uniform1f(L('uSeed'), f.seed)
    gl.uniform1f(L('uMist'), f.mist)
    gl.uniform1f(L('uDrift'), f.drift)
    gl.uniform1f(L('uGrain'), f.grain)
    gl.uniform1i(L('uLayers'), f.layers.length)
    const layerData = new Float32Array(MAX_LAYERS * 4)
    const paintData = new Float32Array(MAX_LAYERS)
    f.layers.forEach((l, i) => {
      layerData.set([l.base, l.amp, l.freq, l.ink], i * 4)
      paintData[i] = f.paint[i] ?? 1
    })
    gl.uniform4fv(L('uLayer'), layerData)
    gl.uniform1fv(L('uPaint'), paintData)
    gl.uniform1f(L('uPaintAll'), f.paintAll)
    gl.uniform2f(L('uShift'), f.shift[0], f.shift[1])
    gl.uniform3f(L('uPaper'), ...f.paper)
    gl.uniform3f(L('uInk'), ...f.ink)
    gl.uniform3f(L('uSunColor'), ...f.sunColor)
    gl.uniform4f(L('uSun'), ...f.sun)
    gl.uniform1f(L('uInkScale'), f.inkScale)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
    if (this.gl && this.program && !this.lost) this.gl.deleteProgram(this.program)
    this.gl = null
    this.program = null
  }
}

/* ----------------------------- component -------------------------------- */

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')
const REDUCED = '(prefers-reduced-motion: reduce)'

export interface InkRidgesProps {
  /** Number of ridges, 1–5. */
  layers?: number
  /** Any number; each one paints a different range. */
  seed?: number
  /** Height of the farthest ridge, 0.3–0.82 of the frame. */
  horizon?: number
  /** How much mist lifts out of each foot, 0–1. */
  mist?: number
  /** Mist drift speed; 0 keeps it still (and lets the landscape stop drawing). */
  drift?: number
  /** Pointer parallax strength; 0 turns it off. */
  parallax?: number
  /** Brush-in time in ms; 0 shows the landscape already painted. */
  paintIn?: number
  /** Draw a sun disc behind the far ridge. */
  sun?: boolean
  /** Sun center in the frame, x left→right and y bottom→top, 0–1. */
  sunPosition?: [number, number]
  /** Sun radius as a fraction of the frame height. */
  sunSize?: number
  /** CSS color of the sun. Defaults to the ink color. */
  sunColor?: string
  /** CSS color of the ink. Defaults to the text color. */
  inkColor?: string
  /** Paper grain, 0–1. */
  grain?: number
  /** Device-pixel-ratio cap for the canvas. */
  dprCap?: number
  /** An accessible description; without it the landscape is treated as decoration. */
  label?: string
  className?: string
  /** Content laid over the landscape. */
  children?: React.ReactNode
}

export default function InkRidges({
  layers = 4,
  seed = 7,
  horizon = 0.62,
  mist = 0.6,
  drift = 0.05,
  parallax = 0.03,
  paintIn = 2400,
  sun = true,
  sunPosition = [0.78, 0.74],
  sunSize = 0.07,
  sunColor,
  inkColor,
  grain = 0.3,
  dprCap = 1.5,
  label,
  className,
  children,
}: InkRidgesProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [glOk, setGlOk] = React.useState(true)
  const opts = React.useRef({ layers, horizon, mist, drift, parallax, paintIn, sun, sunPosition, sunSize, sunColor, inkColor, grain, seed })
  opts.current = { layers, horizon, mist, drift, parallax, paintIn, sun, sunPosition, sunSize, sunColor, inkColor, grain, seed }
  const ctl = React.useRef({ kick: () => {}, repaint: () => {}, retheme: () => {} })

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const reducedMq = window.matchMedia(REDUCED)
    let raf = 0
    let last = 0
    let time = 0
    let visible = true
    let paintStart = performance.now()
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
    let paper: RGB = [1, 1, 1]
    let inkRgb: RGB = [0.1, 0.1, 0.1]
    let sunRgb: RGB = [0.1, 0.1, 0.1]

    const theme = () => {
      const o = opts.current
      paper = resolveColor(root, 'backgroundColor')
      inkRgb = (o.inkColor && resolveCssColor(o.inkColor)) || resolveColor(root, 'color')
      sunRgb = (o.sunColor && resolveCssColor(o.sunColor)) || inkRgb
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const gl = new RidgesGL(canvas, kick)
    if (!gl.ok) {
      setGlOk(false)
      root.style.setProperty('--ink-ridges-paint', '1')
      return () => gl.dispose()
    }
    theme()

    function frame(now: number) {
      raf = 0
      const o = opts.current
      const reduced = reducedMq.matches
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      const p = reduced || o.paintIn <= 0 ? 1 : clamp01((now - paintStart) / o.paintIn)
      if (reduced) {
        ptr.x = ptr.y = ptr.tx = ptr.ty = 0
      } else {
        time += dt
        ptr.x = damp(ptr.x, ptr.tx, 6, dt)
        ptr.y = damp(ptr.y, ptr.ty, 6, dt)
      }
      const n = Math.max(1, Math.min(MAX_LAYERS, Math.round(o.layers)))
      const ridges = Array.from({ length: n }, (_, i) => layerAt(i, n, o.horizon))
      gl.draw({
        time,
        seed: o.seed,
        mist: clamp01(o.mist),
        drift: reduced ? 0 : Math.max(0, o.drift),
        grain: o.grain,
        layers: ridges,
        paint: ridges.map((_, i) => ink(paintAt(p, i, n))),
        paintAll: p,
        shift: [ptr.x, ptr.y],
        paper,
        ink: inkRgb,
        sunColor: sunRgb,
        sun: [o.sunPosition[0], o.sunPosition[1], o.sunSize, o.sun ? 1 : 0],
        inkScale: inkScaleFor(paper),
      })
      root!.style.setProperty('--ink-ridges-paint', String(p))
      const settling = Math.abs(ptr.x - ptr.tx) > 1e-4 || Math.abs(ptr.y - ptr.ty) > 1e-4
      const moving = p < 1 || o.drift > 0 || settling
      if (!reduced && visible && !document.hidden && moving) raf = requestAnimationFrame(frame)
      else last = 0 // the next start takes no time jump
    }

    const resize = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect
      if (!r) return
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      gl.resize(Math.max(1, Math.round(r.width * dpr)), Math.max(1, Math.round(r.height * dpr)))
      kick()
    })
    resize.observe(root)

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible) kick()
    })
    io.observe(root)

    const onPointer = (e: PointerEvent) => {
      const o = opts.current
      if (reducedMq.matches || o.parallax <= 0 || e.pointerType === 'touch') return
      const r = root.getBoundingClientRect()
      ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * o.parallax
      ptr.ty = -((e.clientY - r.top) / r.height - 0.5) * o.parallax
      kick()
    }
    const onLeave = () => {
      ptr.tx = 0
      ptr.ty = 0
      kick()
    }
    root.addEventListener('pointermove', onPointer)
    root.addEventListener('pointerleave', onLeave)

    const onVisibility = () => kick()
    document.addEventListener('visibilitychange', onVisibility)
    reducedMq.addEventListener('change', onVisibility)
    const onTheme = () => {
      theme()
      kick()
    }
    const mo = new MutationObserver(onTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', onTheme)

    ctl.current = {
      kick,
      repaint: () => {
        paintStart = performance.now()
        kick()
      },
      retheme: onTheme,
    }
    kick()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      ctl.current = { kick: () => {}, repaint: () => {}, retheme: () => {} }
      resize.disconnect()
      io.disconnect()
      mo.disconnect()
      root.removeEventListener('pointermove', onPointer)
      root.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMq.removeEventListener('change', onVisibility)
      scheme.removeEventListener('change', onTheme)
      gl.dispose()
    }
  }, [dprCap])

  // a new seed paints a new range from the start
  const firstSeed = React.useRef(true)
  React.useEffect(() => {
    if (firstSeed.current) {
      firstSeed.current = false
      return
    }
    ctl.current.repaint()
  }, [seed])

  // any other change redraws once (and keeps drawing only if something now moves)
  React.useEffect(() => {
    ctl.current.kick()
  }, [layers, horizon, mist, drift, parallax, sun, sunPosition, sunSize, grain])
  React.useEffect(() => {
    ctl.current.retheme()
  }, [inkColor, sunColor])

  return (
    <div ref={rootRef} data-ink-ridges="" className={cn('relative isolate overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn('absolute inset-0 block h-full w-full', !glOk && 'hidden')}
      />
      {!glOk ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 45%, color-mix(in oklab, currentColor 16%, transparent))' }}
        />
      ) : null}
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </div>
  )
}
