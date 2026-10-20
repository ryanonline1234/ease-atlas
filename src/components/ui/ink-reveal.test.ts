import { describe, expect, it } from 'vitest'
import { colorToRgb, createTween, damp, effectiveTrigger, frontAt, originField, resolveEase, scrollProgress } from './ink-reveal'

describe('install-safety', () => {
  it('starts with a use client directive', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./ink-reveal.tsx', import.meta.url), 'utf8')
    expect(src.split('\n')[0]).toBe("'use client'")
  })
  it('imports nothing but React', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./ink-reveal.tsx', import.meta.url), 'utf8')
    const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])
    expect(imports).toEqual(['react'])
  })
  it('treats transparent colors as unresolved', () => {
    expect(colorToRgb('rgba(0, 0, 0, 0)')).toBeNull()
    expect(colorToRgb('transparent')).toBeNull()
    expect(colorToRgb('#336699')).toEqual([0.2, 0.4, 0.6])
  })
})

describe('resolveEase', () => {
  it('resolves atlas names and cubic-bezier strings, defaulting to ink', () => {
    expect(resolveEase('ink')(0.5)).toBeCloseTo(0.636, 2)
    expect(resolveEase('cubic-bezier(0.16, 1, 0.3, 1)')(0.5)).toBeGreaterThan(0.9)
    expect(resolveEase('linear')(0.3)).toBeCloseTo(0.3, 6)
    expect(resolveEase('nonsense')(0.5)).toBeCloseTo(0.636, 2)
  })
})

describe('effectiveTrigger', () => {
  it('turns hover into inView on devices that cannot hover', () => {
    expect(effectiveTrigger('hover', false)).toBe('inView')
    expect(effectiveTrigger('hover', true)).toBe('hover')
    expect(effectiveTrigger('manual', false)).toBe('manual')
    expect(effectiveTrigger('inView', true)).toBe('inView')
  })
})

describe('originField', () => {
  it('blooms radially from the pointer, normalised by the farthest corner', () => {
    const f = originField('pointer', 1, [0, 0])
    expect(f.radial).toBe(1)
    expect(f.seed).toEqual([0, 0])
    expect(f.maxDist).toBeCloseTo(Math.SQRT2, 6)
  })
  it('accounts for aspect ratio in the radial distance', () => {
    expect(originField('center', 2).maxDist).toBeCloseTo(Math.hypot(1, 0.5), 6)
  })
  it('falls back to the center when a pointer origin has no pointer', () => {
    expect(originField('pointer', 1).seed).toEqual([0.5, 0.5])
  })
  it('sweeps linearly from an edge (uv y is up)', () => {
    expect(originField('bottom', 1)).toMatchObject({ radial: 0, dir: [0, 1], off: 0 })
    expect(originField('top', 1)).toMatchObject({ radial: 0, dir: [0, -1], off: 1 })
    expect(originField('left', 1)).toMatchObject({ radial: 0, dir: [1, 0], off: 0 })
    expect(originField('right', 1)).toMatchObject({ radial: 0, dir: [-1, 0], off: 1 })
  })
})

describe('frontAt', () => {
  it('reveals nothing at 0 and everything at 1 for any field value in [0, 1]', () => {
    const lo = frontAt(0, 0.14)
    const hi = frontAt(1, 0.14)
    expect(lo.t + lo.w).toBeLessThan(0)
    expect(hi.t - hi.w).toBeGreaterThanOrEqual(1)
  })
  it('moves monotonically with progress', () => {
    let prev = -Infinity
    for (let i = 0; i <= 20; i++) {
      const { t } = frontAt(i / 20, 0.14)
      expect(t).toBeGreaterThan(prev)
      prev = t
    }
  })
})

describe('createTween', () => {
  function fakeClock() {
    let now = 0
    const queue: Array<(t: number) => void> = []
    return {
      now: () => now,
      raf: (cb: (t: number) => void) => (queue.push(cb), queue.length),
      caf: () => {},
      advance(ms: number) {
        now += ms
        const cbs = queue.splice(0)
        cbs.forEach((cb) => cb(now))
      },
    }
  }
  it('runs from the current value to the target under the ease and calls onDone once', () => {
    const c = fakeClock()
    const seen: number[] = []
    let done = 0
    createTween({ from: 0, to: 1, duration: 100, ease: (t) => t, onUpdate: (v) => seen.push(v), onDone: () => done++ }, c)
    for (let i = 0; i < 12; i++) c.advance(10)
    expect(seen.at(-1)).toBe(1)
    expect(done).toBe(1)
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1]!)).toBe(true)
  })
  it('stops updating once cancelled', () => {
    const c = fakeClock()
    const seen: number[] = []
    const tw = createTween({ from: 0, to: 1, duration: 100, ease: (t) => t, onUpdate: (v) => seen.push(v) }, c)
    c.advance(30)
    tw.cancel()
    const n = seen.length
    c.advance(30)
    expect(seen.length).toBe(n)
  })
  it('finishes immediately for a zero duration', () => {
    const c = fakeClock()
    const seen: number[] = []
    createTween({ from: 0.3, to: 0, duration: 0, ease: (t) => t, onUpdate: (v) => seen.push(v) }, c)
    expect(seen).toEqual([0])
  })
})

describe('scrollProgress (trigger: scroll)', () => {
  const vh = 900
  it('is 0 while the card is still below the viewport', () => {
    expect(scrollProgress(950, 400, vh)).toBe(0)
    expect(scrollProgress(900, 400, vh)).toBe(0)
  })
  it('reaches 1 when the card center reaches the viewport center, and stays there above it', () => {
    expect(scrollProgress(vh / 2 - 200, 400, vh)).toBeCloseTo(1, 9)
    expect(scrollProgress(-300, 400, vh)).toBe(1)
  })
  it('is linear in between', () => {
    expect(scrollProgress(900 - 325, 400, vh)).toBeCloseTo(0.5, 9)
  })
  it('a device that cannot hover keeps the scroll trigger', () => {
    expect(effectiveTrigger('scroll', false)).toBe('scroll')
  })
})

describe('damp', () => {
  it('lands closer each step and is frame-rate independent', () => {
    const a = damp(damp(0, 1, 12, 1 / 120), 1, 12, 1 / 120)
    const b = damp(0, 1, 12, 1 / 60)
    expect(a).toBeCloseTo(b, 9)
    expect(b).toBeGreaterThan(0)
    expect(b).toBeLessThan(1)
  })
})
