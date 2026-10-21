import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

const PORT = 5181
const url = (q = '', dark = 0) => `http://localhost:${PORT}/?demo=ink-headline&dark=${dark}${q}`

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

/** Counts WebGL contexts actually created on the page, from outside the component. */
const countContexts = () => {
  const w = window as unknown as { __glContexts: number }
  w.__glContexts = 0
  const orig = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement & { __counted?: boolean }, type: string, ...rest: unknown[]) {
    const ctx = (orig as (...a: unknown[]) => unknown).call(this, type, ...rest)
    if (ctx && /webgl/.test(type) && !this.__counted) {
      this.__counted = true
      w.__glContexts++
    }
    return ctx
  } as typeof orig
}

async function open(q = '', ctx: BrowserContextOptions & { dark?: number } = {}) {
  const { dark = 0, ...rest } = ctx
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...rest })
  await context.addInitScript(countContexts)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(url(q, dark))
  await page.locator('[data-ink-headline]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  return { page, errors, close: () => context.close() }
}

const P = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-ink-headline]')!).getPropertyValue('--ink-headline')))
const wordOpacities = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-ink-word]')].map((w) => Number(getComputedStyle(w).opacity)))
const canvasVisible = (page: Page) => page.evaluate(() => { const c = document.querySelector<HTMLCanvasElement>('[data-ink-headline] canvas'); return !!c && getComputedStyle(c).visibility !== 'hidden' })

async function settle(page: Page) {
  let v = -1
  for (let k = 0; k < 60; k++) {
    await page.waitForTimeout(50)
    const now = await P(page)
    if (Math.abs(now - v) < 1e-9) break
    v = now
  }
  return v
}

describe('ink headline: real text and one surface', () => {
  it('is a real heading with its full text from the start, on one WebGL context, with a clean console', async () => {
    const { page, errors, close } = await open('&trigger=manual&progress=0.3')
    const name = await page.getByRole('heading', { level: 1 }).textContent()
    expect(name?.replace(/\s+/g, ' ').trim()).toBe('Written in ink, word by word.')
    expect(await page.locator('[data-ink-headline] canvas').getAttribute('aria-hidden')).toBe('true')
    expect(await page.evaluate(() => (window as unknown as { __glContexts: number }).__glContexts)).toBe(1)
    expect(errors).toEqual([])
    await close()
  })
})

describe('ink headline: triggers', () => {
  it('inView inks the words in reading order, then hands off to the text and hides the canvas', async () => {
    const { page, close } = await open()
    const seen: number[][] = []
    for (let k = 0; k < 80; k++) {
      seen.push(await wordOpacities(page))
      if ((await P(page)) >= 1) break
      await page.waitForTimeout(30)
    }
    expect(seen.length).toBeGreaterThan(5)
    // some moment where the first word is fully handed off and the last has not begun
    expect(seen.some((o) => o[0] === 1 && o.at(-1) === 0)).toBe(true)
    // a word never shows its text before the word before it
    expect(seen.every((o) => o.every((v, i) => i === 0 || v <= o[i - 1]! + 1e-9))).toBe(true)
    expect(await P(page)).toBe(1)
    expect(await wordOpacities(page)).toEqual([1, 1, 1, 1, 1, 1])
    expect(await canvasVisible(page)).toBe(false)
    await close()
  })

  it('manual follows the progress prop exactly: nothing at 0, everything at 1', async () => {
    const a = await open('&trigger=manual&progress=0')
    expect(await P(a.page)).toBe(0)
    expect((await wordOpacities(a.page)).every((v) => v === 0)).toBe(true)
    await a.close()
    const b = await open('&trigger=manual&progress=1')
    expect(await P(b.page)).toBe(1)
    expect((await wordOpacities(b.page)).every((v) => v === 1)).toBe(true)
    expect(await canvasVisible(b.page)).toBe(false)
    await b.close()
  })

  it('scroll follows the page and reverses', async () => {
    const { page, close } = await open('&trigger=scroll', { viewport: { width: 1280, height: 600 } })
    await page.addStyleTag({ content: 'body{padding-top:900px;padding-bottom:1400px}' })
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
    const expected = () =>
      page.evaluate(() => {
        const r = document.querySelector('[data-ink-headline]')!.getBoundingClientRect()
        return Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.5 + r.height * 0.5)))
      })
    const top = await settle(page)
    expect(top).toBe(0)
    await page.evaluate(() => window.scrollTo(0, 650))
    const mid = await settle(page)
    expect(mid).toBeGreaterThan(0.2)
    expect(Math.abs(mid - (await expected()))).toBeLessThan(0.005)
    await page.evaluate(() => window.scrollTo(0, 2000))
    expect(await settle(page)).toBe(1)
    await page.evaluate(() => window.scrollTo(0, 0))
    expect(await settle(page)).toBe(0)
    await close()
  })
})

describe('ink headline: the handoff lines up', () => {
  // by=all with a linear curve: the one unit's progress equals the prop. Just before the handoff the
  // canvas shows the dry ink alone; after it, the text alone. They must sit on the same pixels.
  const shot = async (q: string, width: number, shift = 0) => {
    const o = await open(q, { viewport: { width, height: 800 } })
    if (shift) await o.page.addStyleTag({ content: `[data-ink-headline] canvas{transform:translate(${shift}px,0)}` })
    await o.page.waitForTimeout(100)
    const b64 = (await o.page.locator('[data-ink-headline]').screenshot()).toString('base64')
    const visible = await canvasVisible(o.page)
    const words = await wordOpacities(o.page)
    return { b64, visible, words, page: o.page, close: o.close }
  }
  // share of inked pixels (luma < 128) that are inked in one image and not the other
  const mismatch = (page: Page, a: string, b: string) =>
    page.evaluate(async ([x, y]) => {
      const load = async (s: string) => {
        const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob())
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
        const g = c.getContext('2d')!; g.drawImage(bmp, 0, 0)
        return g.getImageData(0, 0, bmp.width, bmp.height).data
      }
      const A = await load(x!), B = await load(y!)
      let ink = 0, off = 0
      for (let i = 0; i < Math.min(A.length, B.length); i += 4) {
        const a = (A[i]! + A[i + 1]! + A[i + 2]!) / 3 < 128, b = (B[i]! + B[i + 1]! + B[i + 2]!) / 3 < 128
        if (a || b) ink++
        if (a !== b) off++
      }
      return { ink, share: off / Math.max(1, ink) }
    }, [a, b] as const)
  for (const width of [1280, 760]) {
    it(`dry ink and real text sit on the same pixels at ${width} px wide (a 2 px shift does not)`, async () => {
      const q = '&trigger=manual&by=all&ease=linear'
      const text = await shot(q + '&progress=1', width)
      expect(text.visible).toBe(false)
      await text.close()
      const ink = await shot(q + '&progress=0.89', width)
      expect(ink.visible).toBe(true)
      expect(ink.words.every((v) => v === 0)).toBe(true)
      const aligned = await mismatch(ink.page, ink.b64, text.b64)
      await ink.close()
      const moved = await shot(q + '&progress=0.89', width, 2)
      const shifted = await mismatch(moved.page, moved.b64, text.b64)
      await moved.close()
      expect(aligned.ink).toBeGreaterThan(1000)
      expect(aligned.share).toBeLessThan(0.03)
      expect(shifted.share).toBeGreaterThan(0.2)
    })
  }
})

describe('ink headline: fallbacks', () => {
  it('reduced motion shows the plain heading and creates no WebGL context', async () => {
    const { page, errors, close } = await open('', { reducedMotion: 'reduce' })
    const r = await page.evaluate(() => ({
      contexts: (window as unknown as { __glContexts: number }).__glContexts,
      canvases: document.querySelectorAll('[data-ink-headline] canvas').length,
      opacities: [...document.querySelectorAll<HTMLElement>('[data-ink-word]')].map((w) => getComputedStyle(w).opacity),
    }))
    expect(r.contexts).toBe(0)
    expect(r.canvases).toBe(0)
    expect(r.opacities.length).toBe(6)
    expect(r.opacities.every((o) => o === '1')).toBe(true)
    expect(errors).toEqual([])
    await close()
  })
})
