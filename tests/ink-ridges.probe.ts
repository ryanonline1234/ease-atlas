import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import { ridgeLineAt, scrollDrop } from '@/components/ui/ink-ridges'

const PORT = 5184
const url = (q = '', dark = 0) => `http://localhost:${PORT}/?demo=ink-ridges&dark=${dark}${q}`

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

/** Counts WebGL contexts and draw calls from outside the component. */
const instrument = () => {
  const w = window as unknown as { __gl: number; __draws: number }
  w.__gl = 0
  w.__draws = 0
  const g = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement & { __c?: boolean }, t: string, ...r: unknown[]) {
    const c = (g as (...a: unknown[]) => unknown).call(this, t, ...r)
    if (c && /webgl/.test(t) && !this.__c) {
      this.__c = true
      w.__gl++
    }
    return c
  } as typeof g
  const d = WebGL2RenderingContext.prototype.drawArrays
  WebGL2RenderingContext.prototype.drawArrays = function (...a: Parameters<typeof d>) {
    w.__draws++
    return d.apply(this, a)
  }
}

async function open(q = '', opts: BrowserContextOptions & { dark?: number } = {}) {
  const { dark = 0, ...ctxOpts } = opts
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light', ...ctxOpts })
  await context.addInitScript(instrument)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(url(q, dark))
  await page.locator('[data-ink-ridges]').waitFor()
  return { page, errors, close: () => context.close() }
}

const paint = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-paint')))
const draws = (page: Page) => page.evaluate(() => (window as unknown as { __draws: number }).__draws)
const waitPainted = (page: Page) => page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-paint')) >= 1, null, { timeout: 15_000 })

async function lumaRange(page: Page) {
  const b64 = (await page.locator('[data-ink-ridges]').screenshot()).toString('base64')
  return page.evaluate(async (s) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob())
    const c = document.createElement('canvas'); c.width = 96; c.height = 54
    const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0, 96, 54)
    const d = x.getImageData(0, 0, 96, 54).data
    let min = 255, max = 0
    for (let i = 0; i < d.length; i += 4) { const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3; min = Math.min(min, l); max = Math.max(max, l) }
    return max - min
  }, b64)
}

describe('ink ridges: render and paint-in', () => {
  it('paints in monotonically to a full, non-flat landscape on one context with a clean console', async () => {
    const { page, errors, close } = await open()
    const seen: number[] = []
    for (let k = 0; k < 60; k++) {
      const v = await paint(page)
      seen.push(v)
      if (v >= 1) break
      await page.waitForTimeout(80)
    }
    expect(seen[0]!).toBeLessThan(0.6)
    expect(seen.at(-1)).toBe(1)
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1]!)).toBe(true)
    expect(await lumaRange(page)).toBeGreaterThan(60)
    expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBe(1)
    expect(errors).toEqual([])
    await close()
  })

  it('dark mode paints a non-flat landscape too', async () => {
    const { page, close } = await open('', { dark: 1 })
    await waitPainted(page)
    expect(await lumaRange(page)).toBeGreaterThan(40)
    await close()
  })
})

describe('ink ridges: frame budget', () => {
  it('a still landscape draws nothing once painted', async () => {
    const { page, close } = await open('&drift=0&paintIn=0&birds=0')
    await waitPainted(page)
    await page.waitForTimeout(300)
    const a = await draws(page)
    await page.waitForTimeout(600)
    expect((await draws(page)) - a).toBe(0)
    await close()
  })

  it('drifting mist keeps drawing while visible and stops once scrolled away', async () => {
    const { page, close } = await open('&paintIn=0')
    await waitPainted(page)
    const a = await draws(page)
    await page.waitForTimeout(500)
    expect((await draws(page)) - a).toBeGreaterThan(2) // keeps drawing; the headless CPU renderer manages ~13 fps here
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(400)
    const b = await draws(page)
    await page.waitForTimeout(600)
    expect((await draws(page)) - b).toBe(0)
    await close()
  })

  it('reduced motion shows the finished landscape at once and does not animate', async () => {
    const { page, close } = await open('', { reducedMotion: 'reduce' })
    await waitPainted(page)
    await page.waitForTimeout(300)
    const a = await draws(page)
    await page.mouse.move(1200, 300)
    await page.waitForTimeout(700)
    expect((await draws(page)) - a).toBe(0)
    expect(await lumaRange(page)).toBeGreaterThan(60)
    await close()
  })
})

describe('ink ridges: interaction', () => {
  it('the pointer shifts the ridges (parallax), then they settle', async () => {
    const { page, close } = await open('&drift=0&paintIn=0&birds=0')
    await waitPainted(page)
    await page.mouse.move(720, 450)
    await page.waitForTimeout(700)
    const before = await page.locator('[data-ink-ridges]').screenshot()
    await page.mouse.move(1430, 450, { steps: 8 })
    await page.waitForTimeout(900)
    const after = await page.locator('[data-ink-ridges]').screenshot()
    expect(Buffer.compare(before, after)).not.toBe(0)
    const a = await draws(page)
    await page.waitForTimeout(500)
    expect((await draws(page)) - a).toBe(0)
    await close()
  })

  it('"Paint another range" repaints a different landscape', async () => {
    const { page, close } = await open('&drift=0&paintIn=600&birds=0')
    await waitPainted(page)
    const first = await page.locator('[data-ink-ridges]').screenshot()
    await page.getByRole('button', { name: /paint another range/i }).click()
    // the repaint starts (progress drops below 1); polled, not sampled at a fixed instant
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-paint')) < 1, null, { timeout: 2000 })
    await waitPainted(page)
    const second = await page.locator('[data-ink-ridges]').screenshot()
    expect(Buffer.compare(first, second)).not.toBe(0)
    await close()
  })
})


describe('ink ridges: sky and birds', () => {
  it('a flock crosses a still landscape, then it goes idle again', async () => {
    const { page, close } = await open('&drift=0&paintIn=0&birdsEvery=1')
    await waitPainted(page)
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-flight')) > 0.2, null, { timeout: 15_000 })
    const a = await draws(page)
    const shotA = await page.locator('[data-ink-ridges]').screenshot()
    await page.waitForTimeout(400)
    expect((await draws(page)) - a).toBeGreaterThan(1)
    const shotB = await page.locator('[data-ink-ridges]').screenshot()
    expect(Buffer.compare(shotA, shotB)).not.toBe(0) // birds moved with nothing else moving
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-flight')) === 0, null, { timeout: 20_000 })
    await page.waitForTimeout(200)
    const b = await draws(page)
    await page.waitForTimeout(300)
    expect((await draws(page)) - b).toBe(0)
    await close()
  }, 60_000)

  it('the JavaScript ridge line the birds follow matches the drawn ridge line', async () => {
    const { page, close } = await open('&drift=0&paintIn=0&birds=0&clouds=0&glow=0&sun=false&mist=0&parallax=0')
    await waitPainted(page)
    const box = (await page.locator('[data-ink-ridges]').boundingBox())!
    const b64 = (await page.locator('[data-ink-ridges]').screenshot({ scale: 'css' })).toString('base64')
    const xs = [0.5, 0.6, 0.7, 0.8, 0.92] // right of the headline block, so the first dark pixel is ink, not type
    const measured: number[] = await page.evaluate(async ([s, cols]) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob())
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
      const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0)
      const out: number[] = []
      for (const fx of cols as number[]) {
        const px = Math.round(fx * (bmp.width - 1))
        const col = x.getImageData(px, 0, 1, bmp.height).data
        const paper = (col[4 * 2]! + col[4 * 2 + 1]! + col[4 * 2 + 2]!) / 3
        let y = -1
        for (let r = 2; r < bmp.height; r++) { const l = (col[4 * r]! + col[4 * r + 1]! + col[4 * r + 2]!) / 3; if (l < paper - 18) { y = r; break } }
        out.push(1 - y / bmp.height)
      }
      return out
    }, [b64, xs] as const)
    const opt = { n: 4, horizon: 0.62, seed: 7, aspect: box.width / box.height, shift: [0, 0] as [number, number] }
    xs.forEach((fx, i) => {
      expect(Math.abs(measured[i]! - ridgeLineAt(0, fx, opt)), `far ridge at x=${fx}`).toBeLessThan(0.02)
    })
    await close()
  })
})

describe('ink ridges: sun, moon and scroll depth', () => {
  const sunPixel = async (page: Page) => {
    const box = (await page.locator('[data-ink-ridges]').boundingBox())!
    const b64 = (await page.locator('[data-ink-ridges]').screenshot({ scale: 'css' })).toString('base64')
    return page.evaluate(async ([s, w, h]) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob())
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
      const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0)
      const d = x.getImageData(Math.round(0.78 * (w as number)), Math.round(0.26 * (h as number)) - 6, 1, 1).data // just above center, clear of the mist
      return [d[0]!, d[1]!, d[2]!]
    }, [b64, box.width, box.height] as const)
  }
  it('paints a red sun on light paper and a pale moon on dark paper', async () => {
    const q = '&drift=0&paintIn=0&birds=0&clouds=0&parallax=0'
    const light = await open(q)
    await waitPainted(light.page)
    const [r, g] = await sunPixel(light.page)
    expect(r! - g!).toBeGreaterThan(40)
    await light.close()
    const dark = await open(q, { dark: 1 })
    await waitPainted(dark.page)
    const [mr, mg, mb] = await sunPixel(dark.page)
    expect((mr! + mg! + mb!) / 3).toBeGreaterThan(140)
    expect(Math.abs(mr! - mb!)).toBeLessThan(25)
    await dark.close()
  })

  it('scrolled, the far ridge sinks and the ridge line the birds follow still matches the drawn one', async () => {
    const { page, close } = await open('&drift=0&paintIn=0&birds=0&clouds=0&glow=0&sun=false&mist=0&parallax=0')
    await waitPainted(page)
    const box0 = (await page.locator('[data-ink-ridges]').boundingBox())!
    const S = 150
    await page.evaluate((y) => window.scrollTo(0, y), S)
    await page.waitForTimeout(400)
    const H = box0.height
    const visible = H - S
    const b64 = (await page.screenshot({ clip: { x: box0.x, y: 0, width: box0.width, height: visible }, scale: 'css' })).toString('base64')
    const xs = [0.5, 0.6, 0.7, 0.8, 0.92]
    const rows: number[] = await page.evaluate(async ([s, cols]) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob())
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
      const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0)
      const out: number[] = []
      for (const fx of cols as number[]) {
        const col = x.getImageData(Math.round(fx * (bmp.width - 1)), 0, 1, bmp.height).data
        const paper = (col[4 * 2]! + col[4 * 2 + 1]! + col[4 * 2 + 2]!) / 3
        let y = -1
        for (let r = 2; r < bmp.height; r++) { const l = (col[4 * r]! + col[4 * r + 1]! + col[4 * r + 2]!) / 3; if (l < paper - 18) { y = r; break } }
        out.push(y)
      }
      return out
    }, [b64, xs] as const)
    const drop = scrollDrop(S, H, 0.35)
    expect(drop).toBeGreaterThan(0.05)
    const opt = { n: 4, horizon: 0.62, seed: 7, aspect: box0.width / H, shift: [0, 0] as [number, number] }
    xs.forEach((fx, i) => {
      expect(rows[i], `found ink at x=${fx}`).toBeGreaterThan(0)
      const measured = 1 - (rows[i]! + S) / H
      expect(Math.abs(measured - ridgeLineAt(0, fx, { ...opt, drop })), `far ridge at x=${fx}`).toBeLessThan(0.02)
      expect(Math.abs(measured - ridgeLineAt(0, fx, opt)), `and it moved at x=${fx}`).toBeGreaterThan(0.03)
    })
    await close()
  })
})

describe('ink ridges: captures for the taste review', () => {
  it('writes light and dark, mid paint-in and painted', async () => {
    const fs = await import('node:fs')
    fs.mkdirSync('tests/__screens__', { recursive: true })
    for (const dark of [0, 1]) {
      const { page, close } = await open('&paintIn=2400', { dark })
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-ink-ridges]')!).getPropertyValue('--ink-ridges-paint')) >= 0.45, null, { timeout: 15_000 })
      await page.screenshot({ path: `tests/__screens__/ridges-${dark ? 'dark' : 'light'}-mid.png` })
      await waitPainted(page)
      await page.waitForTimeout(200)
      await page.screenshot({ path: `tests/__screens__/ridges-${dark ? 'dark' : 'light'}.png` })
      await close()
    }
    expect(true).toBe(true)
  })
})
