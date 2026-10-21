import { describe, expect, it } from 'vitest'
import {
  HANDOFF,
  MAX_SPREAD,
  MAX_UNITS,
  applyTransform,
  colorToRgb,
  effectiveStagger,
  groupLines,
  handoffAt,
  resolveEase,
  scrollProgress,
  splitWords,
  totalTime,
  unitProgress,
  unitsFor,
  wordTiles,
} from './ink-headline'

describe('install-safety', () => {
  it('starts with a use client directive and imports nothing but React', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./ink-headline.tsx', import.meta.url), 'utf8')
    expect(src.split('\n')[0]).toBe("'use client'")
    expect([...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])).toEqual(['react'])
  })
  it('treats transparent colors as unresolved', () => {
    expect(colorToRgb('rgba(0, 0, 0, 0)')).toBeNull()
    expect(colorToRgb('transparent')).toBeNull()
    expect(colorToRgb('#336699')).toEqual([0.2, 0.4, 0.6])
  })
})

describe('splitWords', () => {
  it('splits on whitespace, collapsing runs, and keeps forced line breaks', () => {
    expect(splitWords('Written in  ink,\nword by word.')).toEqual([
      { word: 'Written', space: true, br: false },
      { word: 'in', space: true, br: false },
      { word: 'ink,', space: false, br: true },
      { word: 'word', space: true, br: false },
      { word: 'by', space: true, br: false },
      { word: 'word.', space: false, br: false },
    ])
  })
  it('gives nothing for empty text', () => {
    expect(splitWords('')).toEqual([])
  })
})

describe('groupLines and unitsFor', () => {
  const tops = [190, 190, 191, 284, 284, 285]
  it('starts a new line when a box sits more than half a line lower', () => {
    expect(groupLines(tops, 94)).toEqual([0, 0, 0, 1, 1, 1])
  })
  it('maps words to units by word, by line, or all together', () => {
    const lines = groupLines(tops, 94)
    expect(unitsFor('word', lines)).toEqual([0, 1, 2, 3, 4, 5])
    expect(unitsFor('line', lines)).toEqual([0, 0, 0, 1, 1, 1])
    expect(unitsFor('all', lines)).toEqual([0, 0, 0, 0, 0, 0])
  })
  it('folds more than 64 words into the 64 shader slots, in order', () => {
    const u = unitsFor('word', Array.from({ length: 200 }, () => 0))
    expect(Math.max(...u)).toBe(MAX_UNITS - 1)
    expect(u.every((v, i) => i === 0 || v >= u[i - 1]!)).toBe(true)
  })
})

describe('wordTiles', () => {
  // two lines of three words with tight leading: the line boxes overlap by 15 px
  const boxes: Array<[number, number, number, number]> = [
    [34, 26, 351, 135], [372, 26, 453, 135], [475, 26, 629, 135],
    [34, 120, 243, 229], [265, 120, 362, 229], [383, 120, 616, 229],
  ]
  const lines = [0, 0, 0, 1, 1, 1]
  const tiles = wordTiles(boxes, lines, 29, 1092, 256)
  const overlap = (a: number[], b: number[]) => Math.max(0, Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!)) * Math.max(0, Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!))
  it('never overlaps, so every pixel belongs to one word', () => {
    for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) expect(overlap(tiles[i]!, tiles[j]!)).toBe(0)
  })
  it('splits overlapping lines halfway and neighbouring words halfway across the space', () => {
    expect(tiles[0]![3]).toBeCloseTo((135 + 120) / 2, 9)
    expect(tiles[3]![1]).toBeCloseTo((135 + 120) / 2, 9)
    expect(tiles[0]![2]).toBeCloseTo((351 + 372) / 2, 9)
    expect(tiles[1]![0]).toBeCloseTo((351 + 372) / 2, 9)
  })
  it('reaches pad past the outer edges, clamped to the canvas', () => {
    expect(tiles[0]![0]).toBe(5)
    expect(tiles[0]![1]).toBe(0)
    expect(tiles[5]![3]).toBe(256)
    expect(tiles[2]![2]).toBe(658)
  })
})

describe('the cascade', () => {
  it('uses the asked-for gap unless the cascade would spread past MAX_SPREAD', () => {
    expect(effectiveStagger(120, 6)).toBe(120)
    expect(effectiveStagger(120, 40)).toBeCloseTo(MAX_SPREAD / 39, 9)
    expect(effectiveStagger(120, 1)).toBe(0)
    expect(totalTime(900, 120, 6)).toBe(900 + 600)
    expect(totalTime(900, 120, 100)).toBeCloseTo(900 + MAX_SPREAD, 9)
  })
  it('starts each unit one gap after the last and ends the last one exactly at 1', () => {
    const T = totalTime(900, 120, 6)
    expect(unitProgress(0, 0, 6, 900, 120)).toBe(0)
    expect(unitProgress(120 / T, 1, 6, 900, 120)).toBe(0)
    expect(unitProgress(1020 / T, 1, 6, 900, 120)).toBeCloseTo(1, 9)
    expect(unitProgress(1, 5, 6, 900, 120)).toBe(1)
    expect(unitProgress(0.999, 5, 6, 900, 120)).toBeLessThan(1)
  })
  it('never lets a later unit run ahead of an earlier one', () => {
    for (let P = 0; P <= 1; P += 0.05) for (let k = 1; k < 6; k++) expect(unitProgress(P, k, 6, 900, 120)).toBeLessThanOrEqual(unitProgress(P, k - 1, 6, 900, 120))
  })
})

describe('handoffAt', () => {
  it('keeps the text hidden until HANDOFF, then shows all of it', () => {
    expect(handoffAt(0.5)).toBe(0)
    expect(handoffAt(HANDOFF - 1e-6)).toBe(0)
    expect(handoffAt(HANDOFF)).toBe(1)
    expect(handoffAt(1)).toBe(1)
  })
})

describe('small parts', () => {
  it('applies CSS text-transform to what the canvas draws', () => {
    expect(applyTransform('ink,', 'uppercase')).toBe('INK,')
    expect(applyTransform('INK', 'lowercase')).toBe('ink')
    expect(applyTransform('ink', 'capitalize')).toBe('Ink')
    expect(applyTransform('ink', 'none')).toBe('ink')
  })
  it('scroll progress runs from the bottom edge to the middle', () => {
    expect(scrollProgress(900, 200, 900)).toBe(0)
    expect(scrollProgress(350, 200, 900)).toBeCloseTo(1, 9)
    expect(scrollProgress(625, 200, 900)).toBeCloseTo(0.5, 9)
  })
  it('resolves curves by name, by cubic-bezier, or falls back to ink', () => {
    expect(resolveEase('linear')(0.3)).toBeCloseTo(0.3, 9)
    expect(resolveEase('cubic-bezier(0, 0, 1, 1)')(0.4)).toBeCloseTo(0.4, 3)
    expect(resolveEase('nonsense')(0.5)).toBeCloseTo(resolveEase('ink')(0.5), 9)
  })
})
