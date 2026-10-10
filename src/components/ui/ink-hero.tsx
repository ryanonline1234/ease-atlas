/**
 * ink-hero — a sticky hero scored in three stations. As you scroll, the image
 * develops from a faint wash to a full print, the frame grows to full bleed,
 * the headline bleeds in line by line, and the nav settles.
 *
 * Architecture (awwwards-motion skill, scroll-architecture §2.2 / §6.1 / §7):
 * one ScrollTrigger on a static section publishes one progress value h; every
 * effect is a window of h driven through quick setters; the WebGL dissolve
 * renders only from that update, never from a free rAF. prefers-reduced-motion
 * renders the finished print as a static, complete page.
 *
 * Provenance: the GLSL is authored here from first principles (integer hash,
 * value noise, fbm, feathered threshold). Timing constants are credited on the
 * curve table below. MIT — https://github.com/ryanonline1234/ease-atlas
 */

import * as React from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

/* ----------------------------- pure parts ------------------------------- */

export type EaseFn = (t: number) => number

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

/** Named curves the hero understands. Sources: easings.net bezier twins of the GSAP eases; studio curves observed on the named sites; Emil Kowalski's UI curves. */
export const NAMED_CURVES: Record<string, [number, number, number, number]> = {
  ink: [0.7, 0, 0.2, 1], // observed · oneshot-sakura.vercel.app
  lusion: [0.35, 0, 0, 1], // observed · lusion.co
  osmo: [0.625, 0.05, 0, 1], // observed · osmo.supply
  'ease-out': [0.23, 1, 0.32, 1], // Emil Kowalski
  'ease-in-out': [0.77, 0, 0.175, 1], // Emil Kowalski
  drawer: [0.32, 0.72, 0, 1], // Vaul · Emil Kowalski
  'expo.out': [0.16, 1, 0.3, 1], // easings.net easeOutExpo
  'power4.out': [0.22, 1, 0.36, 1], // easings.net easeOutQuint
  'power3.out': [0.25, 1, 0.5, 1], // easings.net easeOutQuart
  'power2.out': [0.33, 1, 0.68, 1], // easings.net easeOutCubic
  'power2.inOut': [0.65, 0, 0.35, 1], // easings.net easeInOutCubic
  'expo.inOut': [0.87, 0, 0.13, 1], // easings.net easeInOutExpo
  'm3.standard': [0.2, 0, 0, 1], // Material 3
}

/** GSAP's expo.out, blended form from gsap-core.js so it lands exactly on 0 and 1. */
export const expoOut: EaseFn = (t) => {
  const p = 1 - t
  return 1 - (2 ** (10 * (p - 1)) * p + p ** 6 * (1 - p))
}

/** Resolve a curve name, a cubic-bezier() string, or a GSAP ease name to a function. Unknown → linear. */
export function resolveEase(value: string): EaseFn {
  const v = String(value ?? '').trim()
  const named = NAMED_CURVES[v]
  if (named) return cubicBezier(...named)
  const m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
  if (m) return cubicBezier(+m[1]!, +m[2]!, +m[3]!, +m[4]!)
  try {
    const fn = gsap.parseEase(v) as EaseFn | undefined
    if (typeof fn === 'function' && v !== '') return fn
  } catch {
    /* fall through */
  }
  return (t) => t
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
/** Local 0-1 progress of the window [a, b] of h, clamped (scroll-architecture §2.2). */
export const sub = (a: number, b: number) => (h: number) => clamp01((h - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** The score. Every window is a pair of h values; this table IS the choreography. */
export const WINDOWS = {
  developL1: [0.04, 0.48],
  developL2: [0.52, 0.96],
  insetL1: [0.08, 0.5],
  insetL2: [0.52, 0.92],
  scaleL1: [0, 0.5],
  scaleL2: [0.5, 1],
  eyebrow: [0.02, 0.16],
  line1: [0.06, 0.26],
  line2: [0.14, 0.34],
  scrim: [0.6, 0.9],
  nav: [0.55, 0.85],
  caption: [0.78, 0.94],
  cta: [0.84, 0.98],
} as const

export interface TrackValues {
  develop: number
  inset: number
  wash: number
  scale: number
  eyebrow: number
  line1: number
  line2: number
  scrim: number
  nav: number
  caption: number
  cta: number
  station: 0 | 1 | 2
}

export function stationAt(h: number): 0 | 1 | 2 {
  return h < 0.25 ? 0 : h < 0.75 ? 1 : 2
}

/** Evaluate every track at hero progress h. E drives the station legs; R drives the text reveals. */
export function evaluateTracks(h: number, E: EaseFn, R: EaseFn = expoOut): TrackValues {
  const w = WINDOWS
  const leg = (win: readonly [number, number], from: number, to: number) => lerp(from, to, E(sub(win[0], win[1])(h)))
  const reveal = (win: readonly [number, number]) => R(sub(win[0], win[1])(h))
  const develop = h < 0.5 ? leg(w.developL1, 0, 0.42) : leg(w.developL2, 0.42, 1)
  const inset = h < 0.5 ? leg(w.insetL1, 0.22, 0.1) : leg(w.insetL2, 0.1, 0)
  const wash = h < 0.5 ? leg(w.developL1, 1, 0.55) : leg(w.developL2, 0.55, 0)
  const scale = h < 0.5 ? leg(w.scaleL1, 1.1, 1.05) : leg(w.scaleL2, 1.05, 1)
  return {
    develop,
    inset,
    wash,
    scale,
    eyebrow: reveal(w.eyebrow),
    line1: reveal(w.line1),
    line2: reveal(w.line2),
    scrim: leg(w.scrim, 0, 1),
    nav: leg(w.nav, 0, 1),
    caption: reveal(w.caption),
    cta: reveal(w.cta),
    station: stationAt(h),
  }
}

export function splitLines(headline: string | string[]): string[] {
  return Array.isArray(headline) ? headline : headline.split(/\r?\n/)
}

/** object-fit: cover as uv scale factors, used by the shader and the CSS fallback alike. */
export function coverScale(canvasAspect: number, imageAspect: number): { sx: number; sy: number } {
  return canvasAspect > imageAspect ? { sx: 1, sy: imageAspect / canvasAspect } : { sx: canvasAspect / imageAspect, sy: 1 }
}

/** #rgb, #rrggbb, rgb(), rgba() → unit floats. Anything else (oklch, color()) needs a browser; see resolveColor. */
export function colorToRgb(css: string): [number, number, number] | null {
  const s = css.trim()
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const hex = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  }
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)/i)
  if (m) return [+m[1]! / 255, +m[2]! / 255, +m[3]! / 255]
  return null
}

/* ----------------------------- shader ----------------------------------- */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Authored from first principles: an integer hash, value noise, five-octave fbm,
// a feathered threshold with an ink-tinted band at the threshold, a wash look,
// a hand-brushed frame edge, and static paper grain. No copied GLSL.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform vec2 uCover;
uniform float uProgress;
uniform float uInset;
uniform float uWash;
uniform float uScale;
uniform float uFeather;
uniform float uGrain;
uniform float uNoiseScale;
uniform float uHasImage;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec2 uPointer;
uniform float uPointerR;

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
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
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

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  vec2 tuv = 0.5 + (uv - 0.5) * uCover / uScale;
  vec3 img = mix(uPaper, texture(uTex, tuv).rgb, uHasImage);

  // the sheet: a hand-brushed frame while inset > 0; a clean, edge-to-edge print at inset 0
  vec2 d = min(uv, 1.0 - uv);
  float brush = (vnoise(uv * vec2(aspect, 1.0) * 70.0) - 0.5) * 0.012 * smoothstep(0.0, 0.04, uInset);
  float e = min(d.x, d.y) - uInset + brush;
  float frame = uInset <= 0.0005 ? 1.0 : smoothstep(0.0, 0.006, e);

  // the front: fbm islands plus a fine speckle so the edge breaks into droplets, not fog
  vec2 q = uv * vec2(aspect, 1.0);
  float n = fbm(q * uNoiseScale) + (vnoise(q * uNoiseScale * 9.0) - 0.5) * 0.07;
  float w = max(uFeather, 0.002) * 0.5;
  float t = mix(-w - 0.03, 1.0 + w, uProgress);
  // a fine pointer develops the print locally: a soft radial advance of the front
  vec2 dp = (uv - uPointer) * vec2(aspect, 1.0);
  float touch = uPointerR > 0.0 ? exp(-dot(dp, dp) / (uPointerR * uPointerR)) : 0.0;
  t += touch * 0.28 * (1.0 - uProgress);
  float reveal = 1.0 - smoothstep(t - w, t + w, n);
  float band = smoothstep(t - w * 1.2, t, n) * (1.0 - smoothstep(t, t + w * 0.25, n));
  // ink pools where it dries: a thin dark rim right at the front
  float rim = 1.0 - smoothstep(0.0, w * 0.35, abs(n - t));

  float lum = dot(img, vec3(0.299, 0.587, 0.114));
  vec3 washed = mix(uPaper, mix(img, vec3(lum), 0.6), 0.45);
  vec3 col = mix(img, washed, uWash);
  col = mix(col, uInk, band * 0.7 * (0.35 + 0.65 * uWash));
  col *= 1.0 - rim * 0.45 * (0.5 + 0.5 * uWash);
  col += (hash2(uv * uResolution * 0.5) - 0.5) * uGrain * 0.12;

  // before the image develops, the sheet itself is faintly there: a wet-paper tone inside the frame
  float sheet = 0.07 * (1.0 - uProgress);
  vec3 sheetCol = mix(uPaper, uInk, 0.35);
  float alpha = max(reveal, sheet) * frame;
  vec3 outCol = mix(sheetCol, col, reveal / max(alpha / frame, 0.0001));
  fragColor = vec4(outCol * alpha, alpha);
}`

interface GLUniforms {
  progress: number
  inset: number
  wash: number
  scale: number
  feather: number
  grain: number
  noiseScale: number
  paper: [number, number, number]
  ink: [number, number, number]
  pointer: [number, number]
  pointerR: number
}

/** Raw WebGL2 wrapper: one quad, one program, one texture; renders on demand only. */
class InkGL {
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private tex: WebGLTexture | null = null
  private buf: WebGLBuffer | null = null
  private vao: WebGLVertexArrayObject | null = null
  private loc = new Map<string, WebGLUniformLocation | null>()
  private image: HTMLImageElement | null = null
  private last: GLUniforms | null = null
  private lost = false
  /** True when the surface can draw. Flips on context loss and restoration. */
  ok = false

  constructor(
    private canvas: HTMLCanvasElement,
    private onReady?: (ok: boolean) => void,
  ) {
    canvas.addEventListener('webglcontextlost', this.onLost)
    canvas.addEventListener('webglcontextrestored', this.onRestored)
    this.ok = this.init()
    this.onReady?.(this.ok)
  }

  private onLost = (e: Event) => {
    e.preventDefault() // required, or the browser never restores it
    this.lost = true
    this.ok = false
    ;(window as unknown as { __contextLost?: boolean }).__contextLost = true
    this.onReady?.(false)
  }
  private onRestored = () => {
    this.lost = false
    this.ok = this.init()
    if (this.ok && this.image) this.setImage(this.image)
    if (this.ok && this.last) this.render(this.last)
    this.onReady?.(this.ok)
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' })
    if (!gl) return false
    if (gl.isContextLost()) {
      // A previous owner of this canvas (StrictMode's first mount, a route change) left the
      // context lost. Ask for it back; onRestored re-runs init when it arrives.
      this.lost = true
      gl.getExtension('WEBGL_lose_context')?.restoreContext()
      return false
    }
    this.gl = gl
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        const w = window as unknown as { __shaderErrors?: unknown[] }
        w.__shaderErrors = (w.__shaderErrors ?? []).concat([{ type, log }])
        console.error('[SHADER_ERROR]', log)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[SHADER_ERROR]', gl.getProgramInfoLog(program))
      return false
    }
    this.program = program
    gl.useProgram(program)
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    this.buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    for (const name of ['uTex', 'uResolution', 'uCover', 'uProgress', 'uInset', 'uWash', 'uScale', 'uFeather', 'uGrain', 'uNoiseScale', 'uHasImage', 'uPaper', 'uInk', 'uPointer', 'uPointerR'])
      this.loc.set(name, gl.getUniformLocation(program, name))
    this.tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]))
    gl.uniform1i(this.loc.get('uTex')!, 0)
    gl.uniform1f(this.loc.get('uHasImage')!, 0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    return true
  }

  setImage(img: HTMLImageElement) {
    const gl = this.gl
    this.image = img
    if (!gl || !this.tex || this.lost) return
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.uniform1f(this.loc.get('uHasImage')!, 1)
  }

  resize(w: number, h: number, dpr: number) {
    const gl = this.gl
    const W = Math.max(1, Math.round(w * dpr))
    const H = Math.max(1, Math.round(h * dpr))
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W
      this.canvas.height = H
    }
    gl?.viewport(0, 0, W, H)
  }

  render(u: GLUniforms) {
    const gl = this.gl
    this.last = u
    if (!gl || !this.program || this.lost) return
    const W = this.canvas.width
    const H = this.canvas.height
    const aspect = W / Math.max(1, H)
    const ia = this.image ? this.image.naturalWidth / Math.max(1, this.image.naturalHeight) : aspect
    const { sx, sy } = coverScale(aspect, ia)
    gl.uniform2f(this.loc.get('uResolution')!, W, H)
    gl.uniform2f(this.loc.get('uCover')!, sx, sy)
    gl.uniform1f(this.loc.get('uProgress')!, u.progress)
    gl.uniform1f(this.loc.get('uInset')!, u.inset)
    gl.uniform1f(this.loc.get('uWash')!, u.wash)
    gl.uniform1f(this.loc.get('uScale')!, u.scale)
    gl.uniform1f(this.loc.get('uFeather')!, u.feather)
    gl.uniform1f(this.loc.get('uGrain')!, u.grain)
    gl.uniform1f(this.loc.get('uNoiseScale')!, u.noiseScale)
    gl.uniform3f(this.loc.get('uPaper')!, ...u.paper)
    gl.uniform3f(this.loc.get('uInk')!, ...u.ink)
    gl.uniform2f(this.loc.get('uPointer')!, ...u.pointer)
    gl.uniform1f(this.loc.get('uPointerR')!, u.pointerR)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  dispose() {
    const gl = this.gl
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored)
    if (!gl) return
    if (this.tex) gl.deleteTexture(this.tex)
    if (this.buf) gl.deleteBuffer(this.buf)
    if (this.vao) gl.deleteVertexArray(this.vao)
    if (this.program) gl.deleteProgram(this.program)
    this.gl = null
    this.program = null
    this.tex = null
    this.buf = null
    this.vao = null
  }
}

/* ----------------------------- component -------------------------------- */

function resolveCssColor(v: string): [number, number, number] | null {
  const direct = colorToRgb(v)
  if (direct) return direct
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#000'
    ctx.fillStyle = v
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0]! / 255, d[1]! / 255, d[2]! / 255]
  } catch {
    return null
  }
}

function resolveColor(el: Element, prop: 'color' | 'backgroundColor'): [number, number, number] {
  const v = getComputedStyle(el)[prop]
  const direct = colorToRgb(v)
  if (direct) return direct
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000'
      ctx.fillStyle = v
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0]! / 255, d[1]! / 255, d[2]! / 255]
    }
  } catch {
    /* fall through */
  }
  return prop === 'color' ? [0.1, 0.1, 0.1] : [1, 1, 1]
}

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

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')

export interface InkHeroProps {
  image: { src: string; alt: string }
  headline: string | string[]
  eyebrow?: string
  caption?: string
  cta?: { label: string; href: string }
  nav?: { brand: string; links?: { label: string; href: string }[] }
  /** Curve for the station legs: a NAMED_CURVES key, a cubic-bezier() string, or a GSAP ease name. */
  ease?: string
  /** Scroll travel in vh beyond the first screen. 300 ≈ three stations at a comfortable pace. */
  travel?: number
  /** Dissolve edge softness, 0–0.5. Lower is grittier ink; higher is fog. */
  feather?: number
  /** Paper grain, 0–1. */
  grain?: number
  /** Noise scale of the dissolve: larger = finer islands. */
  noiseScale?: number
  /** CSS color for the ink at the front. Defaults to the theme's foreground color. */
  inkColor?: string
  /** A fine pointer develops the print locally where it rests. Off on coarse pointers and under reduced motion. */
  pointerDevelops?: boolean
  /** Called when the station changes (0 paper, 1 wash, 2 print). */
  onStation?: (station: 0 | 1 | 2) => void
  /** How the station rail scrolls the page; pass your Lenis instance's scrollTo when you run one. */
  scrollTo?: (y: number) => void
  /** Device-pixel-ratio cap for the canvas. */
  dprCap?: number
  className?: string
}

const Mask = React.forwardRef<HTMLSpanElement, { children: React.ReactNode; className?: string; innerClassName?: string; motion?: string }>(
  function Mask({ children, className, innerClassName, motion }, ref) {
    return (
      <span className={cn('block overflow-clip [overflow-clip-margin:0.12em]', className)}>
        <span ref={ref} data-motion={motion} className={cn('block will-change-transform', innerClassName)}>
          {children}
        </span>
      </span>
    )
  },
)

export default function InkHero({
  image,
  headline,
  eyebrow,
  caption,
  cta,
  nav = { brand: 'ease-atlas' },
  ease = 'ink',
  travel = 300,
  feather = 0.12,
  grain = 0.35,
  noiseScale = 5,
  inkColor,
  pointerDevelops = true,
  onStation,
  scrollTo,
  dprCap = 1.5,
  className,
}: InkHeroProps) {
  const root = React.useRef<HTMLElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const imgRef = React.useRef<HTMLImageElement>(null)
  const scrimRef = React.useRef<HTMLDivElement>(null)
  const railRef = React.useRef<HTMLDivElement>(null)
  const eyebrowRef = React.useRef<HTMLSpanElement>(null)
  const captionRef = React.useRef<HTMLSpanElement>(null)
  const ctaRef = React.useRef<HTMLSpanElement>(null)
  const lineRefs = React.useRef<Array<HTMLSpanElement | null>>([])
  const reduced = useReducedMotion()
  const [glOk, setGlOk] = React.useState<boolean | null>(null)
  const lines = React.useMemo(() => splitLines(headline), [headline])
  const E = React.useMemo(() => resolveEase(ease), [ease])
  const look = React.useRef({ feather, grain, noiseScale, inkColor, onStation })
  look.current = { feather, grain, noiseScale, inkColor, onStation }

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger)
      const el = root.current
      const stage = stageRef.current
      const canvas = canvasRef.current
      if (!el || !stage || !canvas) return

      // ---- paint: quick setters for every per-frame write (scroll-architecture §7.2)
      const setVar = (name: string) => gsap.quickSetter(el, name)
      const vars = {
        progress: setVar('--ink-progress'),
        develop: setVar('--ink-develop'),
        inset: setVar('--ink-inset'),
        wash: setVar('--ink-wash'),
        station: setVar('--ink-station'),
        line1: setVar('--ink-line-1'),
        line2: setVar('--ink-line-2'),
        scrim: setVar('--ink-scrim'),
        nav: setVar('--ink-nav'),
      }
      const yp = (node: Element | null) => (node ? gsap.quickSetter(node, 'yPercent', '%') : () => {})
      const setEyebrow = yp(eyebrowRef.current)
      const setCaption = yp(captionRef.current)
      const setCta = yp(ctaRef.current)
      const setLines = lineRefs.current.map((n) => yp(n))
      const setScrim = scrimRef.current ? gsap.quickSetter(scrimRef.current, 'opacity') : () => {}
      const rail = railRef.current
      let lastStation = -1

      // ---- the one WebGL surface, rendered only from scroll updates (§7.1)
      const gl = new InkGL(canvas, (ok) => setGlOk(ok))
      let paper: [number, number, number] = [1, 1, 1]
      let ink: [number, number, number] = [0.1, 0.1, 0.1]
      const resolveTheme = () => {
        paper = resolveColor(el, 'backgroundColor')
        const custom = look.current.inkColor ? resolveCssColor(look.current.inkColor) : null
        ink = custom ?? resolveColor(el, 'color')
      }
      const pointer: [number, number] = [-10, -10]
      let pointerR = 0
      resolveTheme()
      let lastH = reduced ? 1 : 0

      const paint = (h: number) => {
        lastH = h
        const v = evaluateTracks(h, E)
        vars.progress(h)
        vars.develop(v.develop)
        vars.inset(v.inset)
        vars.wash(v.wash)
        vars.line1(v.line1)
        vars.line2(v.line2)
        vars.scrim(v.scrim)
        vars.nav(v.nav)
        if (v.station !== lastStation) {
          lastStation = v.station
          vars.station(v.station)
          if (rail) rail.dataset.station = String(v.station)
          look.current.onStation?.(v.station)
        }
        setEyebrow((1 - v.eyebrow) * 101)
        setLines.forEach((set, i) => set((1 - (i === 0 ? v.line1 : i === 1 ? v.line2 : v.line2)) * 101))
        setCaption((1 - v.caption) * 101)
        setCta((1 - v.cta) * 101)
        setScrim(v.scrim)
        if (gl.ok) {
          const { feather: f, grain: g, noiseScale: ns } = look.current
          gl.render({ progress: v.develop, inset: v.inset, wash: v.wash, scale: v.scale, feather: f, grain: g, noiseScale: ns, paper, ink, pointer, pointerR })
        }
      }

      // ---- image: cross-origin texture; the <img> stays as the fallback and for assistive tech
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.decoding = 'async'
      img.onload = () => {
        gl.setImage(img)
        paint(lastH)
      }
      img.src = image.src

      // ---- size the canvas to the stage; re-render at the last progress
      const ro = new ResizeObserver(([entry]) => {
        const r = entry?.contentRect
        if (!r) return
        gl.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, dprCap))
        paint(lastH)
      })
      ro.observe(stage)

      // ---- theme flips (class toggles, OS scheme) re-resolve the paper and ink colors
      const mo = new MutationObserver(() => {
        resolveTheme()
        paint(lastH)
      })
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
      const scheme = window.matchMedia?.('(prefers-color-scheme: dark)')
      const onScheme = () => {
        resolveTheme()
        paint(lastH)
      }
      scheme?.addEventListener?.('change', onScheme)

      // ---- a fine pointer develops the print where it rests: render once per move, never a loop
      const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
      const onMove = (e: PointerEvent) => {
        if (!gl.ok || reduced || !pointerDevelops || !fine) return
        const r = stage.getBoundingClientRect()
        pointer[0] = (e.clientX - r.left) / r.width
        pointer[1] = 1 - (e.clientY - r.top) / r.height
        pointerR = 0.11
        paint(lastH)
      }
      const onLeave = () => {
        if (pointerR === 0) return
        pointerR = 0
        paint(lastH)
      }
      stage.addEventListener('pointermove', onMove, { passive: true })
      stage.addEventListener('pointerleave', onLeave, { passive: true })

      // ---- the one trigger. prefers-reduced-motion is a matchMedia condition so it reverts with the rest (§5.1)
      const mm = gsap.matchMedia()
      mm.add({ reduced: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
        if (ctx.conditions?.reduced) {
          paint(1) // the finished print, statically
          return
        }
        paint(0)
        const st = ScrollTrigger.create({
          id: 'ink-hero',
          trigger: el,
          start: 'clamp(top top)',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => paint(self.progress),
          onRefresh: (self) => paint(self.progress),
        })
        return () => st.kill()
      })

      return () => {
        stage.removeEventListener('pointermove', onMove)
        stage.removeEventListener('pointerleave', onLeave)
        mm.revert()
        ro.disconnect()
        mo.disconnect()
        scheme?.removeEventListener?.('change', onScheme)
        img.onload = null
        gl.dispose()
      }
    },
    { scope: root, dependencies: [E, image.src, lines.length, dprCap, reduced, pointerDevelops] },
  )

  const stationLabels = ['paper', 'wash', 'print']
  const goToStation = (i: number) => {
    const el = root.current
    const stage = stageRef.current
    if (!el || !stage) return
    const travelPx = Math.max(0, el.offsetHeight - stage.offsetHeight)
    const y = Math.round(el.getBoundingClientRect().top + window.scrollY + (travelPx * i) / 2)
    if (scrollTo) scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <section
      ref={root}
      data-ink-hero=""
      data-scene="ink-hero"
      className={cn('relative w-full bg-background text-foreground', className)}
      style={{
        height: reduced ? 'auto' : `calc(100svh + ${travel}vh)`,
        ['--ink-progress' as string]: 0,
        ['--ink-develop' as string]: 0,
        ['--ink-inset' as string]: 0.22,
        ['--ink-wash' as string]: 1,
        ['--ink-station' as string]: 0,
        ['--ink-line-1' as string]: 0,
        ['--ink-line-2' as string]: 0,
        ['--ink-scrim' as string]: 0,
        ['--ink-nav' as string]: 0,
      }}
    >
      <div ref={stageRef} data-motion="ink-stage" className="sticky top-0 h-svh w-full overflow-clip">
        {/* the print. The canvas develops it; the img is the no-WebGL and assistive path */}
        <canvas
          ref={canvasRef}
          data-motion="ink-canvas"
          aria-hidden="true"
          className={cn('absolute inset-0 block h-full w-full', glOk === false && 'hidden')}
        />
        <img
          ref={imgRef}
          src={image.src}
          alt={image.alt}
          crossOrigin="anonymous"
          decoding="async"
          className={cn('absolute inset-0 h-full w-full object-cover', glOk !== false && 'sr-only')}
          style={
            glOk === false
              ? {
                  clipPath: 'inset(calc(var(--ink-inset) * 100%))',
                  opacity: 'calc(0.15 + 0.85 * var(--ink-develop))',
                  transform: 'scale(calc(1.1 - 0.1 * var(--ink-progress)))',
                }
              : undefined
          }
        />

        {/* scrim under the type at the print station */}
        <div
          ref={scrimRef}
          data-motion="ink-scrim"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-background via-background/70 to-transparent"
          style={{ opacity: 0 }}
        />

        {/* nav: transparent over the paper, settles into a bar at the print */}
        <header data-motion="ink-nav" className="absolute inset-x-0 top-0 z-10">
          <div className="absolute inset-0 border-b border-border bg-background/90 backdrop-blur-sm" style={{ opacity: 'var(--ink-nav)' }} aria-hidden="true" />
          <nav className="relative flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] md:px-10">
            <span>{nav.brand}</span>
            {nav.links?.length ? (
              <ul className="flex gap-6">
                {nav.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>
        </header>

        {/* type: anchored bottom-left for the whole score; the image develops around it */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-8 p-6 md:p-10">
          <div className="max-w-3xl">
            {eyebrow ? (
              <Mask ref={eyebrowRef} motion="ink-eyebrow" className="mb-4" innerClassName="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </Mask>
            ) : null}
            <h1 data-motion="ink-headline" className="font-serif text-5xl font-normal leading-[0.98] tracking-[-0.02em] md:text-7xl lg:text-8xl">
              {lines.map((line, i) => (
                <Mask
                  key={i}
                  ref={(n) => {
                    lineRefs.current[i] = n
                  }}
                  motion="ink-line"
                >
                  {line}
                </Mask>
              ))}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              {cta ? (
                <Mask ref={ctaRef} motion="ink-cta">
                  <a
                    href={cta.href}
                    className="inline-flex items-center gap-2 border-b border-foreground pb-0.5 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors duration-150 hover:border-muted-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {cta.label}
                  </a>
                </Mask>
              ) : null}
              {caption ? (
                <Mask ref={captionRef} motion="ink-caption" innerClassName="text-[11px] text-muted-foreground">
                  {caption}
                </Mask>
              ) : null}
            </div>
          </div>

          {/* station rail: each stop is a button that scrolls the score there */}
          <nav ref={railRef} data-station="0" aria-label="Stations" className="group hidden flex-col items-end gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:flex">
            {stationLabels.map((label, i) => (
              <button
                key={label}
                type="button"
                data-dot={i}
                aria-label={`Go to the ${label} station`}
                onClick={() => goToStation(i)}
                className={cn(
                  'flex items-center gap-2 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === 0 && 'opacity-35 group-data-[station=0]:opacity-100',
                  i === 1 && 'opacity-35 group-data-[station=1]:opacity-100',
                  i === 2 && 'opacity-35 group-data-[station=2]:opacity-100',
                )}
              >
                {label}
                <span className="block h-1.5 w-1.5 rounded-full bg-current" />
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}
