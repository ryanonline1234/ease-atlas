// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import EaseAtlas, { ATLAS } from './ease-atlas'

type AnimateSpy = ReturnType<typeof vi.fn>

function installMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function installAnimate(): AnimateSpy {
  const spy = vi.fn(() => ({
    cancel: vi.fn(),
    finished: Promise.resolve(),
    onfinish: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  ;(Element.prototype as unknown as { animate: unknown }).animate = spy
  return spy
}

function installClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

beforeEach(() => installMatchMedia(false))
afterEach(() => cleanup())

describe('EaseAtlas', () => {
  it('renders one copy button per curve, named by the curve', () => {
    installAnimate()
    render(<EaseAtlas />)
    for (const e of ATLAS) {
      expect(screen.getByRole('button', { name: `Copy ${e.name} as CSS` })).toBeTruthy()
    }
  })

  it('clicking a curve writes its CSS value to the clipboard and reports it', async () => {
    installAnimate()
    const writeText = installClipboard()
    const onCopy = vi.fn()
    render(<EaseAtlas onCopy={onCopy} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy expo.out as CSS' }))
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith('cubic-bezier(0.16, 1, 0.3, 1)')
    expect(onCopy).toHaveBeenCalledWith(expect.objectContaining({ name: 'expo.out' }), 'cubic-bezier(0.16, 1, 0.3, 1)')
  })

  it('the format selector changes what gets copied', async () => {
    installAnimate()
    const writeText = installClipboard()
    render(<EaseAtlas />)
    fireEvent.click(screen.getByRole('radio', { name: 'GSAP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy expo.out as GSAP' }))
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith('expo.out')
  })

  it('rides the curve on hover using the sampled function as the timing function', () => {
    const animate = installAnimate()
    render(<EaseAtlas />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Copy expo.out as CSS' }))
    const calls = animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions]>
    expect(calls.length).toBeGreaterThanOrEqual(2)
    const yRide = calls.find(([frames]) => String(frames[0]?.transform).includes('translateY'))
    expect(yRide, 'a translateY ride').toBeTruthy()
    expect(String(yRide![0][0]?.easing)).toMatch(/^linear\(0, /)
    const xRide = calls.find(([frames]) => String(frames[0]?.transform).includes('translateX'))
    expect(xRide, 'a translateX ride').toBeTruthy()
  })

  it('does not animate when the user prefers reduced motion', () => {
    installMatchMedia(true)
    const animate = installAnimate()
    render(<EaseAtlas />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Copy expo.out as CSS' }))
    expect(animate).not.toHaveBeenCalled()
  })

  it('autoplay starts every curve riding without interaction', () => {
    const animate = installAnimate()
    render(<EaseAtlas autoplay />)
    const yRides = (animate.mock.calls as unknown as Array<[Keyframe[]]>).filter(([frames]) =>
      String(frames[0]?.transform).includes('translateY'),
    )
    expect(yRides.length).toBeGreaterThanOrEqual(ATLAS.length)
  })
})
