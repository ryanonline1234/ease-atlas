'use client'

/**
 * ink-reveal — an image that develops like ink soaking into paper. At rest the
 * card holds a faint wash of the image. On hover the ink blooms from where the
 * pointer came in, with a dark rim where it pools, and recedes when the pointer
 * leaves. It can also develop when scrolled into view, or follow a progress
 * value you control.
 *
 * Install
 *   npx @21st-dev/cli add @ryanonline1234/ink-reveal   (needs a free 21st.dev API key)
 *   React 19 and nothing else: no animation library. Tailwind v4 for a handful
 *   of utility classes. shadcn/ui theme tokens are optional; the paper color is
 *   read from the nearest ancestor that has a background, else white.
 *
 * Many on a page
 *   Every InkReveal draws through one shared WebGL2 context and copies its frame
 *   into its own 2D canvas, so a gallery of 30 cards uses one context, not 30
 *   (browsers drop the oldest after about 16). Frames are drawn only while
 *   something changes; there is no idle loop.
 *
 * Image
 *   A cross-origin src needs CORS headers to become a texture. Without them the
 *   card shows the plain image and logs one warning. Same-origin always works.
 *
 * Accessibility
 *   The real <img> stays in the DOM with its alt text. Keyboard focus on a
 *   wrapping link or button develops the card like hover does. Devices that
 *   cannot hover develop it on scroll instead. prefers-reduced-motion shows the
 *   plain image and creates no WebGL context at all.
 *
 * Frameworks
 *   Next.js App Router: a Client Component ('use client' above), import it from
 *   a Server Component page as-is. Vite: nothing extra.
 *
 * Provenance: the GLSL is authored here from first principles (integer hash,
 * value noise, fbm, a seeded front with a feathered threshold). Curves are
 * credited on the table below. MIT — https://github.com/ryanonline1234/ease-atlas
 */

import * as React from 'react'

/* ----------------------------- pure parts ------------------------------- */

export type EaseFn = (t: number) => number
export type Trigger = 'hover' | 'inView' | 'manual'
export type Origin = 'pointer' | 'center' | 'top' | 'bottom' | 'left' | 'right'
type RGB = [number, number, number]

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

/** Curves by name. easings.net bezier twins of the GSAP eases; studio curves observed on the named sites; Emil Kowalski's UI curves. */
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

/** A NAMED_CURVES key, a cubic-bezier() string, or 'linear'. Anything else is the ink curve. */
export function resolveEase(value: string): EaseFn {
  const v = String(value ?? '').trim()
  if (v === 'linear') return (t) => t
  const named = NAMED_CURVES[v]
  if (named) return cubicBezier(...named)
  const m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
  if (m) return cubicBezier(+m[1]!, +m[2]!, +m[3]!, +m[4]!)
  return cubicBezier(...NAMED_CURVES.ink!)
}

/** A device that cannot hover gets the scroll behaviour instead of a hover it can never trigger. */
export function effectiveTrigger(trigger: Trigger, canHover: boolean): Trigger {
  return trigger === 'hover' && !canHover ? 'inView' : trigger
}

/** Where the ink arrives first. uv has y up. Radial fields are normalised by the farthest corner. */
export interface Field {
  radial: 0 | 1
  seed: [number, number]
  dir: [number, number]
  off: number
  maxDist: number
}

const EDGES: Record<string, { dir: [number, number]; off: number }> = {
  bottom: { dir: [0, 1], off: 0 },
  top: { dir: [0, -1], off: 1 },
  left: { dir: [1, 0], off: 0 },
  right: { dir: [-1, 0], off: 1 },
}

export function originField(origin: Origin, aspect: number, pointer?: [number, number]): Field {
  const edge = EDGES[origin]
  if (edge) return { radial: 0, seed: [0.5, 0.5], dir: edge.dir, off: edge.off, maxDist: 1 }
  const seed: [number, number] = origin === 'pointer' && pointer ? pointer : [0.5, 0.5]
  let maxDist = 0
  for (const [cx, cy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const)
    maxDist = Math.max(maxDist, Math.hypot((cx - seed[0]) * aspect, cy - seed[1]))
  return { radial: 1, seed, dir: [0, 0], off: 0, maxDist: Math.max(maxDist, 1e-6) }
}

const DEFAULT_ORIGIN: Record<Trigger, Origin> = { hover: 'pointer', inView: 'bottom', manual: 'center' }

/** The threshold the shader compares the field against (mirrors FRAG): nothing at 0, everything at 1. */
export function frontAt(progress: number, feather: number): { t: number; w: number } {
  const w = Math.max(feather, 0.002) * 0.5
  return { t: -w - 0.03 + (1 + 2 * w + 0.03) * progress, w }
}

export interface Clock {
  now: () => number
  raf: (cb: (t: number) => void) => number
  caf: (id: number) => void
}
const browserClock: Clock = {
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
}

/** A minimal rAF tween: no library, cancellable, lands exactly on `to`. */
export function createTween(
  o: { from: number; to: number; duration: number; ease: EaseFn; onUpdate: (v: number) => void; onDone?: () => void },
  clock: Clock = browserClock,
): { cancel: () => void } {
  if (o.duration <= 0) {
    o.onUpdate(o.to)
    o.onDone?.()
    return { cancel() {} }
  }
  const start = clock.now()
  let dead = false
  let id = 0
  const step = (now: number) => {
    if (dead) return
    const k = Math.min(1, Math.max(0, (now - start) / o.duration))
    o.onUpdate(k >= 1 ? o.to : o.from + (o.to - o.from) * o.ease(k))
    if (k >= 1) {
      dead = true
      o.onDone?.()
    } else id = clock.raf(step)
  }
  id = clock.raf(step)
  return {
    cancel() {
      dead = true
      clock.caf(id)
    },
  }
}

/** object-fit: cover as uv scale factors. */
export function coverScale(canvasAspect: number, imageAspect: number): { sx: number; sy: number } {
  return canvasAspect > imageAspect ? { sx: 1, sy: imageAspect / canvasAspect } : { sx: canvasAspect / imageAspect, sy: 1 }
}

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

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/* ----------------------------- shader ----------------------------------- */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Authored here: an integer hash, value noise, five-octave fbm. The front is the
// fbm field pulled toward a seed point (or an edge), thresholded with a feather;
// an ink band and a darker rim sit on the front; the unrevealed paper holds a
// faint desaturated ghost of the image; static paper grain on top.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform vec2 uCover;
uniform float uScale;
uniform float uProgress;
uniform float uFeather;
uniform float uGrain;
uniform float uNoiseScale;
uniform float uRest;
uniform float uRadial;
uniform vec2 uSeed;
uniform vec2 uDir;
uniform float uOff;
uniform float uMaxDist;
uniform vec3 uPaper;
uniform vec3 uInk;

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

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 img = texture(uTex, 0.5 + (uv - 0.5) * uCover / uScale).rgb;

  vec2 q = uv * vec2(aspect, 1.0);
  float n = fbm(q * uNoiseScale) + (vnoise(q * uNoiseScale * 9.0) - 0.5) * 0.07;
  float d = uRadial > 0.5 ? length((uv - uSeed) * vec2(aspect, 1.0)) / uMaxDist : clamp(dot(uv, uDir) + uOff, 0.0, 1.0);
  float f = mix(n, d, 0.4);

  float w = max(uFeather, 0.002) * 0.5;
  float t = -w - 0.03 + (1.0 + 2.0 * w + 0.03) * uProgress;
  float reveal = 1.0 - smoothstep(t - w, t + w, f);
  float band = smoothstep(t - w * 0.8, t, f) * (1.0 - smoothstep(t, t + w * 0.2, f));
  float rim = 1.0 - smoothstep(0.0, w * 0.22, abs(f - t));

  float lum = dot(img, vec3(0.299, 0.587, 0.114));
  vec3 ghost = mix(uPaper, mix(img, vec3(lum), 0.65), uRest);
  vec3 col = mix(ghost, img, reveal);
  col = mix(col, mix(img, uInk, 0.7), band * 0.42); // the tide line carries the image's own tone into the ink
  col *= 1.0 - rim * 0.22;
  col += (hash2(uv * uResolution * 0.5) - 0.5) * uGrain * 0.1;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = ['uTex', 'uResolution', 'uCover', 'uScale', 'uProgress', 'uFeather', 'uGrain', 'uNoiseScale', 'uRest', 'uRadial', 'uSeed', 'uDir', 'uOff', 'uMaxDist', 'uPaper', 'uInk'] as const

interface DrawUniforms {
  progress: number
  feather: number
  grain: number
  noiseScale: number
  rest: number
  scale: number
  paper: RGB
  ink: RGB
  field: Field
  cover: { sx: number; sy: number }
}

/**
 * One WebGL2 context for every InkReveal on the page. Each instance owns a
 * texture here and a 2D canvas in the DOM; a draw renders into the top-left
 * W×H of this detached canvas and copies that rectangle out.
 */
class InkSurface {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private loc = new Map<string, WebGLUniformLocation | null>()
  private textures = new Map<number, WebGLTexture>()
  private images = new Map<number, HTMLImageElement>()
  private redraws = new Map<number, () => void>()
  private lost = false
  ok = false

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = 2
    this.canvas.height = 2
    this.canvas.addEventListener('webglcontextlost', this.onLost)
    this.canvas.addEventListener('webglcontextrestored', this.onRestored)
    this.ok = this.init()
  }

  private onLost = (e: Event) => {
    e.preventDefault() // required, or the browser never restores it
    this.lost = true
    this.ok = false
  }

  private onRestored = () => {
    this.lost = false
    this.textures.clear()
    this.ok = this.init()
    if (!this.ok) return
    for (const [id, img] of this.images) this.upload(id, img)
    for (const redraw of this.redraws.values()) redraw()
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' })
    if (!gl || gl.isContextLost()) return false
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh
      console.error('[ink-reveal] shader error', gl.getShaderInfoLog(sh))
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
      console.error('[ink-reveal] link error', gl.getProgramInfoLog(program))
      return false
    }
    gl.useProgram(program)
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    this.loc.clear()
    for (const name of UNIFORMS) this.loc.set(name, gl.getUniformLocation(program, name))
    gl.uniform1i(this.loc.get('uTex')!, 0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.enable(gl.SCISSOR_TEST)
    this.gl = gl
    this.program = program
    return true
  }

  register(id: number, redraw: () => void) {
    this.redraws.set(id, redraw)
  }

  upload(id: number, img: HTMLImageElement) {
    this.images.set(id, img)
    const gl = this.gl
    if (!gl || this.lost) return
    const tex = this.textures.get(id) ?? gl.createTexture()!
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    this.textures.set(id, tex)
  }

  forget(id: number) {
    const tex = this.textures.get(id)
    if (tex && this.gl && !this.lost) this.gl.deleteTexture(tex)
    this.textures.delete(id)
    this.images.delete(id)
    this.redraws.delete(id)
  }

  draw(id: number, target: CanvasRenderingContext2D, width: number, height: number, u: DrawUniforms): boolean {
    const gl = this.gl
    const tex = this.textures.get(id)
    if (!gl || !this.program || !this.ok || !tex || width < 1 || height < 1) return false
    if (this.canvas.width < width || this.canvas.height < height) {
      this.canvas.width = Math.min(4096, Math.max(this.canvas.width, width))
      this.canvas.height = Math.min(4096, Math.max(this.canvas.height, height))
    }
    const W = Math.min(width, this.canvas.width)
    const H = Math.min(height, this.canvas.height)
    const y = this.canvas.height - H // GL rows count from the bottom; this is the canvas's top-left W×H
    gl.useProgram(this.program)
    gl.viewport(0, y, W, H)
    gl.scissor(0, y, W, H)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    const L = (n: string) => this.loc.get(n)!
    gl.uniform2f(L('uResolution'), W, H)
    gl.uniform2f(L('uCover'), u.cover.sx, u.cover.sy)
    gl.uniform1f(L('uScale'), u.scale)
    gl.uniform1f(L('uProgress'), u.progress)
    gl.uniform1f(L('uFeather'), u.feather)
    gl.uniform1f(L('uGrain'), u.grain)
    gl.uniform1f(L('uNoiseScale'), u.noiseScale)
    gl.uniform1f(L('uRest'), u.rest)
    gl.uniform1f(L('uRadial'), u.field.radial)
    gl.uniform2f(L('uSeed'), u.field.seed[0], u.field.seed[1])
    gl.uniform2f(L('uDir'), u.field.dir[0], u.field.dir[1])
    gl.uniform1f(L('uOff'), u.field.off)
    gl.uniform1f(L('uMaxDist'), u.field.maxDist)
    gl.uniform3f(L('uPaper'), ...u.paper)
    gl.uniform3f(L('uInk'), ...u.ink)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    target.clearRect(0, 0, W, H)
    target.drawImage(this.canvas, 0, 0, W, H, 0, 0, W, H)
    return true
  }
}

let surface: InkSurface | null = null
/** The page's one surface, created on first use. null when WebGL2 is unavailable. */
function getSurface(): InkSurface | null {
  if (typeof document === 'undefined') return null
  if (!surface) surface = new InkSurface()
  return surface.ok ? surface : null
}
let nextId = 1

/* ----------------------------- component -------------------------------- */

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

function useMedia(query: string, serverDefault: boolean): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  )
}

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')
const REDUCED = '(prefers-reduced-motion: reduce)'
const CAN_HOVER = '(hover: hover) and (pointer: fine)'

export interface InkRevealProps {
  src: string
  alt: string
  /** 'hover' (default), 'inView' (develops when scrolled into view), or 'manual' (follows `progress`). */
  trigger?: Trigger
  /** 0–1, used when trigger is 'manual'. */
  progress?: number
  /** Where the ink arrives first. Defaults: hover → 'pointer', inView → 'bottom', manual → 'center'. */
  origin?: Origin
  /** A NAMED_CURVES key ('ink', 'lusion', 'expo.out', …), a cubic-bezier() string, or 'linear'. */
  ease?: string
  /** Develop time in ms (default 1200); receding takes 70% of it. The viewer is watching, so 900–1400 reads right. */
  duration?: number
  /** How much of the image shows at rest, 0 (blank paper) to 1. */
  rest?: number
  /** Edge softness of the front, 0–0.5. Lower is grittier ink, higher is fog. */
  feather?: number
  /** Paper grain, 0–1. */
  grain?: number
  /** Size of the ink islands: larger is finer. */
  noiseScale?: number
  /** CSS color of the ink at the front. Defaults to the text color. */
  inkColor?: string
  /** inView: develop once and stay (default), or recede when scrolled away. */
  once?: boolean
  /** CSS aspect-ratio of the card. Default '4 / 5'. */
  aspectRatio?: string | number
  /** Device-pixel-ratio cap for the canvas. */
  dprCap?: number
  className?: string
  /** Overlay content, laid over the image (pointer events pass through). */
  children?: React.ReactNode
}

export default function InkReveal({
  src,
  alt,
  trigger = 'hover',
  progress = 0,
  origin,
  ease = 'ink',
  duration = 1200,
  rest = 0.2,
  feather = 0.14,
  grain = 0.3,
  noiseScale = 5,
  inkColor,
  once = true,
  aspectRatio = '4 / 5',
  dprCap = 2,
  className,
  children,
}: InkRevealProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reduced = useMedia(REDUCED, false)
  const canHover = useMedia(CAN_HOVER, true)
  const mode = effectiveTrigger(trigger, canHover)
  const [failed, setFailed] = React.useState(false)
  const plain = reduced || failed
  const E = React.useMemo(() => resolveEase(ease), [ease])

  // Everything the frame loop reads lives in refs, so a tween never re-renders React.
  const live = React.useRef({
    p: mode === 'manual' ? clamp01(progress) : 0,
    field: null as Field | null,
    tween: null as { cancel: () => void } | null,
    ready: false,
    pending: false,
    aspect: 1,
    paint: () => {},
    start: () => {},
  })
  const opts = React.useRef({ mode, origin, E, duration, rest, feather, grain, noiseScale, inkColor })
  opts.current = { mode, origin, E, duration, rest, feather, grain, noiseScale, inkColor }

  const animateTo = React.useCallback((target: number, ms: number) => {
    const s = live.current
    s.tween?.cancel()
    const distance = Math.abs(target - s.p)
    s.tween = createTween({
      from: s.p,
      to: target,
      duration: ms * Math.max(0.35, distance),
      ease: opts.current.E,
      onUpdate: (v) => {
        s.p = v
        s.paint()
      },
      onDone: () => {
        s.tween = null
      },
    })
  }, [])

  const seed = React.useCallback((fallback: Origin, pointer?: [number, number]) => {
    const s = live.current
    if (s.p > 0.02) return // keep the front where it is mid-flight
    s.field = originField(opts.current.origin ?? fallback, s.aspect, pointer)
  }, [])

  // The surface, the texture, the canvas size, the theme colors.
  React.useEffect(() => {
    if (plain || window.matchMedia(REDUCED).matches) return
    const surf = getSurface()
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!surf || !root || !canvas || !ctx) {
      setFailed(true)
      return
    }
    const id = nextId++
    const s = live.current
    let W = 0
    let H = 0
    let imgAspect = 1
    let paper: RGB = [1, 1, 1]
    let ink: RGB = [0.1, 0.1, 0.1]
    const theme = () => {
      paper = resolveColor(root, 'backgroundColor')
      const custom = opts.current.inkColor ? resolveCssColor(opts.current.inkColor) : null
      ink = custom ?? resolveColor(root, 'color')
    }
    theme()

    s.paint = () => {
      root.style.setProperty('--ink-reveal', String(s.p))
      if (!s.ready || !W || !H) return
      const o = opts.current
      surf.draw(id, ctx, W, H, {
        progress: s.p,
        feather: o.feather,
        grain: o.grain,
        noiseScale: o.noiseScale,
        rest: o.rest,
        scale: 1 + 0.05 * (1 - s.p),
        paper,
        ink,
        field: s.field ?? originField(o.origin ?? DEFAULT_ORIGIN[o.mode], s.aspect),
        cover: coverScale(W / H, imgAspect),
      })
    }
    surf.register(id, () => s.paint())
    s.paint()

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight)
      surf.upload(id, img)
      s.ready = true
      s.paint()
      if (s.pending) {
        s.pending = false
        s.start()
      }
    }
    img.onerror = () => {
      console.warn(
        `[ink-reveal] ${src} could not become a WebGL texture (usually the host sends no CORS headers). ` +
          'Showing the plain image. Serve it same-origin or from a host that sends Access-Control-Allow-Origin.',
      )
      setFailed(true)
    }
    img.src = src

    const ro = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect
      if (!r) return
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      W = Math.max(1, Math.round(r.width * dpr))
      H = Math.max(1, Math.round(r.height * dpr))
      canvas.width = W
      canvas.height = H
      s.aspect = r.width / Math.max(1, r.height)
      s.paint()
    })
    ro.observe(root)

    const onTheme = () => {
      theme()
      s.paint()
    }
    const mo = new MutationObserver(onTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', onTheme)

    return () => {
      s.tween?.cancel()
      s.tween = null
      s.ready = false
      s.paint = () => {}
      ro.disconnect()
      mo.disconnect()
      scheme.removeEventListener('change', onTheme)
      img.onload = null
      img.onerror = null
      surf.forget(id)
    }
  }, [src, plain, dprCap])

  // hover: bloom from the entry point; keyboard focus on a wrapping link or button counts as hover
  React.useEffect(() => {
    if (plain || mode !== 'hover') return
    const root = rootRef.current
    if (!root) return
    const host = (root.parentElement?.closest('a,button,[tabindex]') as HTMLElement | null) ?? root
    const enter = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const r = root.getBoundingClientRect()
      seed('pointer', [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height])
      animateTo(1, opts.current.duration)
    }
    const leave = () => animateTo(0, opts.current.duration * 0.7)
    const focusIn = () => {
      seed('center')
      animateTo(1, opts.current.duration)
    }
    const focusOut = (e: FocusEvent) => {
      if (!host.contains(e.relatedTarget as Node | null)) animateTo(0, opts.current.duration * 0.7)
    }
    root.addEventListener('pointerenter', enter)
    root.addEventListener('pointerleave', leave)
    host.addEventListener('focusin', focusIn)
    host.addEventListener('focusout', focusOut)
    return () => {
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
      host.removeEventListener('focusin', focusIn)
      host.removeEventListener('focusout', focusOut)
    }
  }, [plain, mode, animateTo, seed])

  // inView: develop when a third of the card is visible, waiting for the texture if it is still loading
  React.useEffect(() => {
    if (plain || mode !== 'inView') return
    const root = rootRef.current
    if (!root) return
    const s = live.current
    s.start = () => {
      seed('bottom')
      animateTo(1, opts.current.duration)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) {
          if (s.ready) s.start()
          else s.pending = true
          if (once) io.disconnect()
        } else if (!once) {
          s.pending = false
          animateTo(0, opts.current.duration * 0.7)
        }
      },
      { threshold: 0.35 },
    )
    io.observe(root)
    return () => {
      io.disconnect()
      s.pending = false
      s.start = () => {}
    }
  }, [plain, mode, once, animateTo, seed])

  // manual: follow the prop exactly
  React.useEffect(() => {
    if (plain || mode !== 'manual') return
    const s = live.current
    s.tween?.cancel()
    s.tween = null
    s.p = clamp01(progress)
    s.field = null // paint derives it from the current size and origin
    s.paint()
  }, [plain, mode, progress, origin])

  return (
    <div
      ref={rootRef}
      data-ink-reveal=""
      data-trigger={mode}
      className={cn('relative isolate overflow-hidden', className)}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      {!plain ? <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" /> : null}
      <img
        src={src}
        alt={alt}
        // Same request mode as the texture so both share one cached response; dropped
        // after a texture failure, which makes the browser refetch the image plainly.
        crossOrigin={plain ? undefined : 'anonymous'}
        decoding="async"
        draggable={false}
        className={cn('absolute inset-0 h-full w-full object-cover', !plain && 'sr-only')}
      />
      {children ? <div className="pointer-events-none absolute inset-0 z-10">{children}</div> : null}
    </div>
  )
}
