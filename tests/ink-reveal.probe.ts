import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

const PORT = 5180
const url = (q = '') => `http://localhost:${PORT}/?demo=ink-reveal&dark=0${q}`

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

async function open(q = '', ctx: BrowserContextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctx })
  await context.addInitScript(countContexts)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(url(q))
  await page.locator('[data-ink-reveal]').first().waitFor()
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll<HTMLImageElement>('[data-ink-reveal] img')]
    return imgs.length >= 4 && imgs.every((i) => i.complete && i.naturalWidth > 0)
  }, null, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return { page, errors, close: () => context.close() }
}

const reveal = (page: Page, i = 0) =>
  page.evaluate((idx) => Number(getComputedStyle(document.querySelectorAll('[data-ink-reveal]')[idx]!).getPropertyValue('--ink-reveal')), i)

async function sampleUntil(page: Page, i: number, target: number, ms = 2500) {
  const seen: number[] = []
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const v = await reveal(page, i)
    seen.push(v)
    if (Math.abs(v - target) < 1e-6) break // the tween lands exactly on its target
    await page.waitForTimeout(40)
  }
  return seen
}

describe('ink reveal: one surface for the whole page', () => {
  it('renders four cards through a single WebGL context with a clean console', async () => {
    const { page, errors, close } = await open()
    const n = await page.locator('[data-ink-reveal]').count()
    expect(n).toBeGreaterThanOrEqual(4)
    expect(await page.evaluate(() => (window as unknown as { __glContexts: number }).__glContexts)).toBe(1)
    expect(errors).toEqual([])
    await close()
  })
})

describe('ink reveal: triggers', () => {
  it('hover develops the card to 1 monotonically and leaving returns it to 0', async () => {
    const { page, close } = await open()
    const card = page.locator('[data-ink-reveal]').first()
    expect(await reveal(page)).toBe(0)
    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.7)
    const up = await sampleUntil(page, 0, 1)
    expect(up.at(-1)).toBeCloseTo(1, 3)
    expect(up.length).toBeGreaterThan(3)
    expect(up.every((v, i) => i === 0 || v >= up[i - 1]! - 1e-9)).toBe(true)
    await page.mouse.move(5, 5)
    const down = await sampleUntil(page, 0, 0)
    expect(down.at(-1)).toBeCloseTo(0, 3)
    await close()
  })

  it('inView develops every visible card without interaction', async () => {
    const { page, close } = await open('&trigger=inView')
    await page.waitForTimeout(1600)
    const vals = await page.evaluate(() => [...document.querySelectorAll('[data-ink-reveal]')].map((e) => Number(getComputedStyle(e).getPropertyValue('--ink-reveal'))))
    expect(vals.every((v) => v > 0.999)).toBe(true)
    await close()
  })

  it('manual follows the progress prop exactly', async () => {
    const { page, close } = await open('&trigger=manual&progress=0.4')
    expect(await reveal(page)).toBeCloseTo(0.4, 6)
    await close()
  })

  it('a device that cannot hover gets the inView behaviour', async () => {
    const { page, close } = await open('', { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
    await page.waitForTimeout(1600)
    expect(await reveal(page, 0)).toBeGreaterThan(0.999)
    await close()
  })
})

describe('ink reveal: what the canvas shows', () => {
  it('the rest state is a faint image, not a blank, and developing changes it', async () => {
    const { page, close } = await open('&trigger=manual&progress=0')
    const rest = (await page.locator('[data-ink-reveal]').first().screenshot()).toString('base64')
    await close()
    const b = await open('&trigger=manual&progress=1')
    const full = (await b.page.locator('[data-ink-reveal]').first().screenshot()).toString('base64')
    const stats = await b.page.evaluate(async ([r, f]) => {
      const lumaRange = async (b64: string) => {
        const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
        const c = document.createElement('canvas'); c.width = 48; c.height = 60
        const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0, 48, 60)
        const d = x.getImageData(0, 0, 48, 60).data
        let min = 255, max = 0, sum = 0
        for (let i = 0; i < d.length; i += 4) { const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3; min = Math.min(min, l); max = Math.max(max, l); sum += l }
        return { range: max - min, mean: sum / (d.length / 4) }
      }
      return { rest: await lumaRange(r!), full: await lumaRange(f!) }
    }, [rest, full])
    expect(stats.rest.range).toBeGreaterThan(8)
    expect(stats.full.range).toBeGreaterThan(stats.rest.range + 30)
    await b.close()
  })
})

describe('ink reveal: fallbacks', () => {
  it('reduced motion shows the plain images and creates no WebGL context', async () => {
    const { page, errors, close } = await open('', { reducedMotion: 'reduce' })
    const r = await page.evaluate(() => ({
      contexts: (window as unknown as { __glContexts: number }).__glContexts,
      visibleImgs: [...document.querySelectorAll('[data-ink-reveal] img')].filter((i) => !i.classList.contains('sr-only')).length,
      cards: document.querySelectorAll('[data-ink-reveal]').length,
    }))
    expect(r.contexts).toBe(0)
    expect(r.visibleImgs).toBe(r.cards)
    expect(errors).toEqual([])
    await close()
  })

  it('an image host without CORS headers falls back to the plain image', async () => {
    const fs = await import('node:fs')
    const http = await import('node:http')
    const bytes = fs.readFileSync('playground/public/og.jpg')
    const srv = http.createServer((_q, res) => { res.writeHead(200, { 'content-type': 'image/jpeg' }); res.end(bytes) })
    await new Promise<void>((r) => srv.listen(5197, r))
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    await page.goto(url('&src=' + encodeURIComponent('http://127.0.0.1:5197/x.jpg')))
    await page.waitForFunction(() => { const i = document.querySelector<HTMLImageElement>('[data-ink-reveal] img'); return !!i && !i.classList.contains('sr-only') && i.complete && i.naturalWidth > 0 }, null, { timeout: 15_000 })
    const r = await page.evaluate(() => ({ crossorigin: document.querySelector('[data-ink-reveal] img')!.getAttribute('crossorigin') }))
    expect(r.crossorigin).toBeNull()
    expect(pageErrors).toEqual([])
    await context.close()
    srv.close()
  })
})

describe('ink reveal: captures for the taste review', () => {
  it('writes light and dark grids at rest, mid-develop and developed', async () => {
    const fs = await import('node:fs')
    fs.mkdirSync('tests/__screens__', { recursive: true })
    for (const dark of [0, 1]) {
      for (const p of [0, 0.45, 1]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light' })
        const page = await context.newPage()
        await page.goto(`http://localhost:${PORT}/?demo=ink-reveal&dark=${dark}&trigger=manual&progress=${p}`)
        // every card's canvas must have drawn before the shot: a black frame fails here, not silently
        await page.waitForFunction(
          () => {
            // never vacuous: all four cards must exist before "every card drew" means anything
            const cs = [...document.querySelectorAll<HTMLCanvasElement>('[data-ink-reveal] canvas')]
            return cs.length >= 4 && cs.every((c) => c.width > 1 && c.getContext('2d')!.getImageData(c.width >> 1, c.height >> 1, 1, 1).data[3]! > 0)
          },
          null,
          { timeout: 15_000 },
        )
        await page.screenshot({ path: `tests/__screens__/reveal-${dark ? 'dark' : 'light'}-${p}.png` })
        await context.close()
      }
    }
    expect(true).toBe(true)
  })
})
