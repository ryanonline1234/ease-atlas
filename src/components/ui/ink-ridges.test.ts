import { describe, expect, it } from 'vitest'
import { colorToRgb, damp, inkScaleFor, layerAt, paintAt } from './ink-ridges'

describe('install-safety', () => {
  it('starts with a use client directive and imports nothing but React', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./ink-ridges.tsx', import.meta.url), 'utf8')
    expect(src.split('\n')[0]).toBe("'use client'")
    expect([...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])).toEqual(['react'])
  })
  it('treats transparent colors as unresolved', () => {
    expect(colorToRgb('rgba(0, 0, 0, 0)')).toBeNull()
    expect(colorToRgb('transparent')).toBeNull()
    expect(colorToRgb('#336699')).toEqual([0.2, 0.4, 0.6])
  })
})

describe('layerAt', () => {
  it('runs far to near: lower, bigger, finer and darker toward the viewer', () => {
    const n = 4
    const L = Array.from({ length: n }, (_, i) => layerAt(i, n, 0.62))
    expect(L[0]!.base).toBeCloseTo(0.62, 6)
    for (let i = 1; i < n; i++) {
      expect(L[i]!.base).toBeLessThan(L[i - 1]!.base)
      expect(L[i]!.amp).toBeGreaterThan(L[i - 1]!.amp)
      expect(L[i]!.freq).toBeGreaterThan(L[i - 1]!.freq)
      expect(L[i]!.ink).toBeGreaterThan(L[i - 1]!.ink)
    }
    expect(L[n - 1]!.ink).toBeLessThanOrEqual(0.75)
  })
  it('keeps every ridge inside the frame', () => {
    for (const n of [1, 2, 3, 5]) {
      for (let i = 0; i < n; i++) {
        const l = layerAt(i, n, 0.7)
        expect(l.base - l.amp).toBeGreaterThan(0)
        expect(l.base + l.amp).toBeLessThan(1)
      }
    }
  })
  it('handles a single layer', () => {
    expect(layerAt(0, 1, 0.5).base).toBeCloseTo(0.5, 6)
  })
})

describe('paintAt', () => {
  it('paints nothing at 0 and everything at 1', () => {
    for (let i = 0; i < 4; i++) {
      expect(paintAt(0, i, 4)).toBe(0)
      expect(paintAt(1, i, 4)).toBe(1)
    }
  })
  it('starts the far ridge first and never runs backwards', () => {
    expect(paintAt(0.2, 0, 4)).toBeGreaterThan(paintAt(0.2, 3, 4))
    for (let i = 0; i < 4; i++) {
      let prev = -1
      for (let k = 0; k <= 50; k++) {
        const v = paintAt(k / 50, i, 4)
        expect(v).toBeGreaterThanOrEqual(prev)
        prev = v
      }
    }
  })
})

describe('damp', () => {
  it('is frame-rate independent: two half steps equal one full step', () => {
    const once = damp(0, 1, 8, 0.032)
    const twice = damp(damp(0, 1, 8, 0.016), 1, 8, 0.016)
    expect(twice).toBeCloseTo(once, 10)
  })
  it('converges on the target and never overshoots', () => {
    let v = 0
    for (let k = 0; k < 200; k++) {
      v = damp(v, 1, 8, 1 / 60)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(v).toBeCloseTo(1, 6)
  })
})

describe('inkScaleFor', () => {
  it('keeps full ink on light paper and eases it off on dark paper', () => {
    expect(inkScaleFor([1, 1, 1])).toBe(1)
    expect(inkScaleFor([0.06, 0.06, 0.06])).toBeLessThan(0.75)
    expect(inkScaleFor([0, 0, 0])).toBeCloseTo(0.62, 6)
  })
})
