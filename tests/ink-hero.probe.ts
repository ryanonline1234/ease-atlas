import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

const PORT = 5179
const URL_LIGHT = `http://localhost:${PORT}/?demo=ink-hero&dark=0`
const URL_DARK = `http://localhost:${PORT}/?demo=ink-hero&dark=1`

let server: ViteDevServer
let browser: Browser

beforeAll(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { port: PORT, strictPort: true }, logLevel: 'silent' })
  await server.listen()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist'] })
})
afterAll(async () => {
  await browser?.close()
  await server?.close()
})

async function openPage(url: string, opts: { reducedMotion?: 'reduce' | 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion ?? 'no-preference' })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(url)
  await page.locator('[data-ink-hero]').waitFor()
  // let the image texture land
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('[data-ink-hero] img')
    return !!img && img.complete && img.naturalWidth > 0
  }, null, { timeout: 30_000 })
  await page.waitForTimeout(400)
  return { page, errors }
}

const readVars = (page: import('playwright').Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ink-hero]')!
    const cs = getComputedStyle(el)
    const v = (n: string) => Number(cs.getPropertyValue(n))
    return {
      progress: v('--ink-progress'),
      develop: v('--ink-develop'),
      inset: v('--ink-inset'),
      wash: v('--ink-wash'),
      nav: v('--ink-nav'),
      heightPx: el.getBoundingClientRect().height,
      shaderErrors: (window as unknown as { __shaderErrors?: unknown[] }).__shaderErrors?.length ?? 0,
      contextLost: (window as unknown as { __contextLost?: boolean }).__contextLost ?? false,
      canvasHidden: document.querySelector('[data-motion="ink-canvas"]')?.classList.contains('hidden') ?? true,
      lineY: getComputedStyle(document.querySelector('[data-motion="ink-line"]')!).transform,
    }
  })

describe('ink hero: the WebGL surface', () => {
  it('compiles its shader, keeps its context, and logs no errors through a full scroll', async () => {
    const { page, errors } = await openPage(URL_LIGHT)
    for (const y of [0, 600, 1350, 2100, 2700, 3600]) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      await page.waitForTimeout(250)
    }
    const v = await readVars(page)
    expect(v.shaderErrors).toBe(0)
    expect(v.contextLost).toBe(false)
    expect(v.canvasHidden).toBe(false)
    expect(errors.filter((e) => /WebGL|GL_INVALID|shader|texture|framebuffer/i.test(e))).toEqual([])
    expect(errors).toEqual([])
    await page.close()
  })
})

describe('ink hero: reduced motion is a finished, static page', () => {
  it('renders the print with no scroll travel and the headline in place', async () => {
    const { page, errors } = await openPage(URL_LIGHT, { reducedMotion: 'reduce' })
    const v = await readVars(page)
    expect(v.develop).toBeCloseTo(1, 3)
    expect(v.inset).toBeCloseTo(0, 3)
    expect(v.wash).toBeCloseTo(0, 3)
    expect(v.nav).toBeCloseTo(1, 3)
    expect(v.heightPx).toBeLessThanOrEqual(900 + 1)
    // lines sit at rest (no residual translate)
    expect(v.lineY === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(v.lineY)).toBe(true)
    const anims = await page.evaluate(() => document.getAnimations().length)
    expect(anims).toBe(0)
    expect(errors).toEqual([])
    await page.close()
  })
})


describe('ink hero: the station rail and the pointer', () => {
  it('clicking a station button scrolls the score to that station', async () => {
    const { page, errors } = await openPage(URL_LIGHT)
    await page.getByRole('button', { name: 'Go to the wash station' }).click()
    await page.waitForTimeout(1800)
    const v = await readVars(page)
    expect(v.progress).toBeCloseTo(0.5, 1)
    await page.getByRole('button', { name: 'Go to the print station' }).click()
    await page.waitForTimeout(1800)
    expect((await readVars(page)).progress).toBeCloseTo(1, 1)
    expect(errors).toEqual([])
    await page.close()
  })

  it('a fine pointer over the wash changes what the canvas draws, and leaving restores it', async () => {
    const { page } = await openPage(URL_LIGHT)
    await page.evaluate(() => window.scrollTo(0, 1350))
    await page.waitForTimeout(900)
    const stage = page.locator('[data-motion="ink-stage"]')
    const before = await stage.screenshot()
    await page.mouse.move(720, 420)
    await page.waitForTimeout(150)
    const during = await stage.screenshot()
    await page.mouse.move(5, 5)
    await page.locator('[data-motion="ink-stage"]').dispatchEvent('pointerleave')
    await page.waitForTimeout(150)
    const after = await stage.screenshot()
    expect(Buffer.compare(before, during)).not.toBe(0)
    expect(Buffer.compare(before, after)).toBe(0)
    await page.close()
  })
})

describe('ink hero: captures for the taste review', () => {
  it('writes light and dark stills at the three stations', async () => {
    const fs = await import('node:fs')
    fs.mkdirSync('tests/__screens__', { recursive: true })
    for (const [name, url] of [['light', URL_LIGHT], ['dark', URL_DARK]] as const) {
      const { page } = await openPage(url)
      for (const [station, y] of [['paper', 0], ['wash', 1350], ['print', 2700]] as const) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y)
        await page.waitForTimeout(900)
        await page.screenshot({ path: `tests/__screens__/ink-${name}-${station}.png` })
      }
      await page.close()
    }
    expect(true).toBe(true)
  })
})
