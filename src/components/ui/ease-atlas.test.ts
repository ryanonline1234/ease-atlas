import { describe, it, expect } from 'vitest'
import {
  ATLAS,
  cssLinear,
  cubicBezier,
  parseEase,
  rangeOf,
  samplePath,
  sampleStops,
  toCopyText,
} from './ease-atlas'

const pathYs = (d: string) =>
  d.replace(/^M/, '').split(' L').map((p) => Number(p.trim().split(' ')[1]))

describe('cubicBezier', () => {
  it('is the identity for the linear control points', () => {
    const f = cubicBezier(0, 0, 1, 1)
    for (const x of [0, 0.25, 0.5, 0.75, 1]) expect(f(x)).toBeCloseTo(x, 5)
  })
  it('passes through the midpoint of the symmetric ease-in-out', () => {
    expect(cubicBezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 5)
  })
  it('overshoots 1 for the easeOutBack control points', () => {
    const f = cubicBezier(0.34, 1.56, 0.64, 1)
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => f(i / 100)))
    expect(peak).toBeGreaterThan(1.05)
  })
})

describe('parseEase', () => {
  it('parses cubic-bezier and keeps the control points', () => {
    const e = parseEase('cubic-bezier(0.16, 1, 0.3, 1)')!
    expect(e.kind).toBe('bezier')
    expect(e.bezier).toEqual([0.16, 1, 0.3, 1])
    expect(e.fn(0.5)).toBeGreaterThan(0.9)
  })
  it('evaluates GSAP power2.out as 1-(1-t)^3', () => {
    expect(parseEase('power2.out')!.fn(0.5)).toBeCloseTo(0.875, 6)
  })
  it('maps Penner easeOutCubic to the GSAP name power2.out', () => {
    const e = parseEase('easeOutCubic')!
    expect(e.gsap).toBe('power2.out')
    expect(e.fn(0.5)).toBeCloseTo(0.875, 6)
  })
  it('keeps the back.out amplitude', () => {
    const e = parseEase('back.out(3)')!
    expect(e.gsap).toBe('back.out(3)')
    expect(rangeOf(e.fn).hi).toBeGreaterThan(1.2)
  })
  it('keeps the elastic.out amplitude and period and lands on 1', () => {
    const e = parseEase('elastic.out(1, 0.3)')!
    expect(e.fn(0)).toBe(0)
    expect(e.fn(1)).toBe(1)
    expect(rangeOf(e.fn).hi).toBeGreaterThan(1.1)
  })
  it('resolves CSS keywords to their bezier equivalents', () => {
    const e = parseEase('ease-out')!
    expect(e.kind).toBe('keyword')
    expect(e.bezier).toEqual([0, 0, 0.58, 1])
  })
  it('parses a CustomEase SVG path', () => {
    const e = parseEase('M0,0 C0.5,0 0.5,1 1,1')!
    expect(e.kind).toBe('path')
    expect(e.fn(0.5)).toBeCloseTo(0.5, 3)
    expect(e.fn(1)).toBeCloseTo(1, 6)
  })
  it('never evaluates arbitrary JavaScript', () => {
    expect(parseEase('t => (globalThis as any).pwned = 1')).toBeNull()
  })
  it('bounce.out lands exactly on 1', () => {
    expect(parseEase('bounce.out')!.fn(1)).toBeCloseTo(1, 10)
  })
})

describe('one function feeds both outputs', () => {
  it('samplePath and cssLinear use the identical stops', () => {
    const fn = parseEase('expo.out')!.fn
    const stops = sampleStops(fn, 8)
    expect(stops).toHaveLength(9)
    expect(cssLinear(fn, 8)).toBe(`linear(${stops.map((v) => +v.toFixed(4)).join(', ')})`)
    const ys = pathYs(samplePath(fn, { w: 100, h: 100, pad: 0, n: 8 }))
    stops.forEach((v, i) => expect(ys[i]).toBeCloseTo(100 - 100 * v, 1))
  })
  it('an overshooting curve is kept inside its plot when lo/hi come from rangeOf', () => {
    const fn = parseEase('elastic.out(1, 0.3)')!.fn
    const { lo, hi } = rangeOf(fn)
    const ys = pathYs(samplePath(fn, { w: 100, h: 100, pad: 0, n: 64, lo, hi }))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.01)
    expect(Math.max(...ys)).toBeLessThanOrEqual(100.01)
  })
})

describe('ATLAS', () => {
  it('has 24 entries with unique names', () => {
    expect(ATLAS).toHaveLength(24)
    expect(new Set(ATLAS.map((e) => e.name)).size).toBe(ATLAS.length)
  })
  it('every entry parses, starts at 0 and ends at 1', () => {
    for (const e of ATLAS) {
      const p = parseEase(e.value)
      expect(p, e.name).not.toBeNull()
      expect(p!.fn(0), e.name).toBeCloseTo(0, 6)
      expect(p!.fn(1), e.name).toBeCloseTo(1, 6)
    }
  })
  it('every entry names its source', () => {
    for (const e of ATLAS) expect(e.source, e.name).toMatch(/\S/)
  })
})

describe('toCopyText', () => {
  const expo = ATLAS.find((e) => e.name === 'expo.out')!
  const emil = ATLAS.find((e) => e.name === 'ease-out (Emil)')!
  const bounce = ATLAS.find((e) => e.name === 'bounce.out')!

  it('copies a bezier curve as cubic-bezier in css format', () => {
    expect(toCopyText(expo, 'css')).toBe('cubic-bezier(0.16, 1, 0.3, 1)')
  })
  it('copies the GSAP name when the entry has one', () => {
    expect(toCopyText(expo, 'gsap')).toBe('expo.out')
  })
  it('copies a CustomEase call for a bezier without a GSAP name', () => {
    expect(toCopyText(emil, 'gsap')).toBe('CustomEase.create("ease-out-emil", "0.23, 1, 0.32, 1")')
  })
  it('falls back to linear() in css format when no bezier exists', () => {
    expect(toCopyText(bounce, 'css')).toMatch(/^linear\(0, /)
  })
  it('copies a CSS custom property in token format', () => {
    expect(toCopyText(expo, 'token')).toBe('--ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);')
  })
})

describe('adaptive sampling density', () => {
  it('keeps 64 stops for a smooth curve and goes denser for one the polyline cannot track', async () => {
    const { stopCountFor } = await import('./ease-atlas')
    expect(stopCountFor(parseEase('expo.out')!.fn)).toBe(64)
    expect(stopCountFor(parseEase('bounce.out')!.fn)).toBeGreaterThan(64)
  })
  it('keeps every atlas curve within 0.5% of its function between stops', async () => {
    const { stopCountFor } = await import('./ease-atlas')
    for (const e of ATLAS) {
      const fn = parseEase(e.value)!.fn
      const n = stopCountFor(fn)
      const stops = sampleStops(fn, n)
      let worst = 0
      for (let i = 0; i < n; i++) {
        const mid = (stops[i]! + stops[i + 1]!) / 2
        worst = Math.max(worst, Math.abs(mid - fn((i + 0.5) / n)))
      }
      expect(worst, e.name).toBeLessThan(0.005)
    }
  })
})
