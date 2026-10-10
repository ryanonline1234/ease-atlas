import { describe, expect, it } from 'vitest'
import { colorToRgb, coverScale, evaluateTracks, resolveEase, splitLines, stationAt } from './ink-hero'

describe('resolveEase', () => {
  it('resolves the ink curve by name to its bezier', () => {
    const f = resolveEase('ink')
    expect(f(0.25)).toBeCloseTo(0.066, 2)
    expect(f(0.5)).toBeCloseTo(0.636, 2)
    expect(f(0.75)).toBeCloseTo(0.954, 2)
  })
  it('resolves GSAP names and raw cubic-bezier strings', () => {
    expect(resolveEase('power2.inOut')(0.5)).toBeCloseTo(0.5, 6)
    expect(resolveEase('cubic-bezier(0.16, 1, 0.3, 1)')(0.5)).toBeGreaterThan(0.9)
  })
  it('falls back to linear for an unknown name', () => {
    const f = resolveEase('not-a-curve')
    expect(f(0.3)).toBeCloseTo(0.3, 6)
  })
})

describe('evaluateTracks', () => {
  const E = resolveEase('ink')
  it('sits at the paper station at h=0', () => {
    const v = evaluateTracks(0, E)
    expect(v.develop).toBe(0)
    expect(v.inset).toBeCloseTo(0.22, 6)
    expect(v.wash).toBe(1)
    expect(v.scale).toBeCloseTo(1.1, 6)
    expect(v.line1).toBe(0)
    expect(v.line2).toBe(0)
    expect(v.scrim).toBe(0)
    expect(v.nav).toBe(0)
  })
  it('sits at the wash station at h=0.5', () => {
    const v = evaluateTracks(0.5, E)
    expect(v.develop).toBeCloseTo(0.42, 6)
    expect(v.inset).toBeCloseTo(0.1, 6)
    expect(v.wash).toBeCloseTo(0.55, 6)
    expect(v.line1).toBe(1)
    expect(v.line2).toBe(1)
    expect(v.scrim).toBe(0)
    expect(v.nav).toBe(0)
  })
  it('sits at the print station at h=1', () => {
    const v = evaluateTracks(1, E)
    expect(v.develop).toBe(1)
    expect(v.inset).toBe(0)
    expect(v.wash).toBe(0)
    expect(v.scale).toBeCloseTo(1, 6)
    expect(v.scrim).toBe(1)
    expect(v.nav).toBe(1)
    expect(v.caption).toBe(1)
    expect(v.cta).toBe(1)
  })
  it('develops monotonically and lands exactly', () => {
    let prev = -1
    for (let i = 0; i <= 200; i++) {
      const d = evaluateTracks(i / 200, E).develop
      expect(d).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = d
    }
    expect(prev).toBe(1)
  })
  it('reveals line 2 after line 1 has started', () => {
    const at = (h: number) => evaluateTracks(h, E)
    expect(at(0.1).line1).toBeGreaterThan(0)
    expect(at(0.1).line2).toBe(0)
  })
})

describe('stationAt', () => {
  it('is 0 below a quarter, 1 below three quarters, else 2', () => {
    expect(stationAt(0)).toBe(0)
    expect(stationAt(0.24)).toBe(0)
    expect(stationAt(0.25)).toBe(1)
    expect(stationAt(0.74)).toBe(1)
    expect(stationAt(0.75)).toBe(2)
    expect(stationAt(1)).toBe(2)
  })
})

describe('splitLines', () => {
  it('accepts an array, a newline-separated string, or a single line', () => {
    expect(splitLines(['a', 'b'])).toEqual(['a', 'b'])
    expect(splitLines('a\nb')).toEqual(['a', 'b'])
    expect(splitLines('one line')).toEqual(['one line'])
  })
})

describe('coverScale', () => {
  it('crops the wider image horizontally and the taller image vertically', () => {
    expect(coverScale(16 / 9, 2)).toEqual({ sx: 16 / 9 / 2, sy: 1 })
    expect(coverScale(16 / 9, 1)).toEqual({ sx: 1, sy: 1 / (16 / 9) })
  })
})

describe('colorToRgb', () => {
  it('parses hex and rgb() into unit floats', () => {
    expect(colorToRgb('#336699')).toEqual([0.2, 0.4, 0.6])
    expect(colorToRgb('rgb(255, 0, 0)')).toEqual([1, 0, 0])
  })
  it('returns null for colors it cannot parse without a browser', () => {
    expect(colorToRgb('oklch(0.145 0 0)')).toBeNull()
  })
})
