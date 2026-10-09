import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { ATLAS, parseEase, rangeOf } from '@/components/ui/ease-atlas'

const PORT = 5178
const RIDE = 2 / 3

let server: ViteDevServer
let browser: Browser
let page: Page
const pageErrors: string[] = []

/** Pause the cell's ride, seek it to each t, and read where the marker actually is (fraction of plot height from the top). */
async function measure(page: Page, name: string, ts: number[]) {
  return page.evaluate(
    async ({ name, ts, RIDE }) => {
      const cell = document.querySelector<HTMLElement>(`[aria-label="Copy ${name} as CSS"]`)!
      const y = cell.querySelector<HTMLElement>('[data-ride="y"]')!
      const x = cell.querySelector<HTMLElement>('[data-ride="x"]')!
      const ay = y.getAnimations()[0]
      const ax = x.getAnimations()[0]
      if (!ay || !ax) return { ys: [] as number[], xs: [] as number[], anims: 0 }
      ay.pause()
      ax.pause()
      const cycle = Number((ay.effect as KeyframeEffect).getTiming().duration)
      const ys: number[] = []
      const xs: number[] = []
      for (const t of ts) {
        ay.currentTime = t * RIDE * cycle
        ax.currentTime = t * RIDE * cycle
        ys.push(new DOMMatrix(getComputedStyle(y).transform).m42 / y.getBoundingClientRect().height)
        xs.push(new DOMMatrix(getComputedStyle(x).transform).m41 / x.getBoundingClientRect().width)
      }
      return { ys, xs, anims: y.getAnimations().length }
    },
    { name, ts, RIDE },
  )
}

const expectedY = (name: string, t: number) => {
  const entry = ATLAS.find((e) => e.name === name)!
  const fn = parseEase(entry.value)!.fn
  const { lo, hi } = rangeOf(fn)
  return (hi - fn(t)) / (hi - lo)
}

beforeAll(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { port: PORT, strictPort: true }, logLevel: 'silent' })
  await server.listen()
  browser = await chromium.launch()
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push(m.text())
  })
  await page.goto(`http://localhost:${PORT}/?dark=0`)
  await page.getByRole('button', { name: 'Copy expo.out as CSS' }).waitFor()
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

describe('the marker rides the function it is drawn from', () => {
  // t values on the 64-stop grid (exact) and between stops (interpolated)
  const onGrid = [0, 8 / 64, 16 / 64, 24 / 64, 32 / 64, 40 / 64, 48 / 64, 56 / 64, 1]
  const offGrid = [0.1, 0.37, 0.52, 0.81, 0.93]

  it('autoplay rides exist for every curve, with no page errors', async () => {
    for (const e of ATLAS) {
      const m = await measure(page, e.name, [0])
      expect(m.anims, e.name).toBeGreaterThan(0)
    }
    expect(pageErrors).toEqual([])
  })

  for (const e of ATLAS) {
    it(`${e.name}: measured marker matches f(t)`, async () => {
      const m = await measure(page, e.name, [...onGrid, ...offGrid])
      onGrid.forEach((t, i) => {
        expect(m.ys[i], `${e.name} y at t=${t}`).toBeCloseTo(expectedY(e.name, t), 3)
        expect(m.xs[i], `${e.name} x at t=${t}`).toBeCloseTo(t, 3)
      })
      offGrid.forEach((t, j) => {
        const i = onGrid.length + j
        expect(Math.abs(m.ys[i]! - expectedY(e.name, t)), `${e.name} y between stops at t=${t}`).toBeLessThan(0.01)
      })
    })
  }

  it('positive control: the probe rejects the wrong curve', async () => {
    const m = await measure(page, 'expo.out', onGrid)
    const worst = Math.max(...onGrid.map((t, i) => Math.abs(m.ys[i]! - expectedY('power1.out', t))))
    expect(worst).toBeGreaterThan(0.05)
  })
})

describe('reduced motion', () => {
  it('creates no animations and parks the marker at the end of the curve', async () => {
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
    await p2.goto(`http://localhost:${PORT}/?dark=0`)
    await p2.getByRole('button', { name: 'Copy expo.out as CSS' }).waitFor()
    await p2.getByRole('button', { name: 'Copy expo.out as CSS' }).hover()
    const r = await p2.evaluate(() => {
      const cell = document.querySelector<HTMLElement>('[aria-label="Copy expo.out as CSS"]')!
      const y = cell.querySelector<HTMLElement>('[data-ride="y"]')!
      const x = cell.querySelector<HTMLElement>('[data-ride="x"]')!
      return {
        anims: cell.getAnimations({ subtree: true }).filter((a) => ((a.effect as KeyframeEffect).target as HTMLElement).dataset.ride).length,
        yFrac: new DOMMatrix(getComputedStyle(y).transform).m42 / y.getBoundingClientRect().height,
        xFrac: new DOMMatrix(getComputedStyle(x).transform).m41 / x.getBoundingClientRect().width,
      }
    })
    expect(r.anims).toBe(0)
    expect(r.yFrac).toBeCloseTo(expectedY('expo.out', 1), 3)
    expect(r.xFrac).toBeCloseTo(1, 3)
    await p2.close()
  })
})

describe('screens for the taste review', () => {
  it('captures light and dark', async () => {
    const fs = await import('node:fs')
    fs.mkdirSync('tests/__screens__', { recursive: true })
    for (const theme of ['light', 'dark'] as const) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
      await p.goto(`http://localhost:${PORT}/?dark=${theme === 'dark' ? 1 : 0}`)
      await p.getByRole('button', { name: 'Copy expo.out as CSS' }).waitFor()
      await p.waitForTimeout(900)
      await p.screenshot({ path: `tests/__screens__/${theme}.png`, fullPage: true })
      await p.close()
    }
    expect(true).toBe(true)
  })
})
