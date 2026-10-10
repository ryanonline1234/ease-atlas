import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Snap from 'lenis/snap'
import InkHero from '@/components/ui/ink-hero'

const settings = {
  ease: 'ink',
  travel: 300,
  feather: 0.12,
  grain: 0.35,
  noiseScale: 5,
  inkColor: '#1b1613',
  pointerDevelops: true,
  smoothScroll: true,
  snapToStations: true,
  eyebrow: 'Sumi-e · a scroll score in three stations',
  headline: 'Ink on paper,\ndeveloped by scroll.',
  caption: 'Sesshū Tōyō (attr.), Landscape, 15th c. · Honolulu Museum of Art · public domain',
  ctaLabel: 'Read the score',
  imageSrc:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Landscape_attributed_to_Sesshu_Toyo%2C_Honolulu_Museum_of_Art.JPG/1920px-Landscape_attributed_to_Sesshu_Toyo%2C_Honolulu_Museum_of_Art.JPG',
}

/** Lenis on the window, driven by the GSAP ticker: the canonical four statements (scroll-architecture §1.1). Demo-only; the component never owns scroll. */
function useSmoothScroll(enabled: boolean, snapToStations: boolean) {
  const lenisRef = useRef<Lenis | null>(null)
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false, anchors: true }) // anchors: the demo has #score links (scroll-architecture §1.2)
    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    ;(window as unknown as { lenis?: Lenis }).lenis = lenis
    lenisRef.current = lenis

    let snap: Snap | null = null
    const placeStations = () => {
      snap?.destroy()
      snap = null
      if (!snapToStations) return
      const hero = document.querySelector<HTMLElement>('[data-ink-hero]')
      if (!hero) return
      const travelPx = hero.offsetHeight - window.innerHeight
      if (travelPx <= 0) return
      snap = new Snap(lenis, { type: 'proximity', distanceThreshold: '18%', debounce: 400, lerp: 0.1 })
      snap.add(hero.offsetTop + travelPx * 0.5)
      snap.add(hero.offsetTop + travelPx)
    }
    placeStations()
    const onRefresh = () => placeStations()
    ScrollTrigger.addEventListener('refresh', onRefresh)
    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      snap?.destroy()
      gsap.ticker.remove(tick)
      lenis.off('scroll', onScroll)
      lenis.destroy()
      lenisRef.current = null
      delete (window as unknown as { lenis?: Lenis }).lenis
    }
  }, [enabled, snapToStations])
  return lenisRef
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const lenisRef = useSmoothScroll(s.smoothScroll, s.snapToStations)
  return (
    <div className="bg-background text-foreground">
      {/* the three rules lenis/dist/lenis.css would set; inlined so the demo stays one file */}
      <style>{`html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}.lenis.lenis-stopped{overflow:clip}`}</style>
      <InkHero
        image={{ src: s.imageSrc, alt: 'Ink landscape attributed to Sesshū Tōyō: mountains and a river in splashed ink on paper' }}
        eyebrow={s.eyebrow}
        headline={s.headline}
        caption={s.caption}
        cta={{ label: s.ctaLabel, href: '#score' }}
        nav={{ brand: 'ease-atlas', links: [{ label: 'Score', href: '#score' }] }}
        ease={s.ease}
        travel={s.travel}
        feather={s.feather}
        grain={s.grain}
        noiseScale={s.noiseScale}
        inkColor={s.inkColor}
        pointerDevelops={s.pointerDevelops}
        scrollTo={(y) => (lenisRef.current ? lenisRef.current.scrollTo(y, { duration: 1.1 }) : window.scrollTo({ top: y, behavior: 'smooth' }))}
      />
      <section id="score" data-scene="after" className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
        <h2 data-motion="after-heading" className="font-serif text-3xl leading-tight md:text-4xl">
          The score, in three stations.
        </h2>
        <dl className="mt-8 grid gap-6 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">Paper</dt>
            <dd className="mt-2">A small frame on bare paper. The headline bleeds in, line by line, on expo.out.</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">Wash</dt>
            <dd className="mt-2">The image develops to a faint wash and the frame grows, both on the ink curve, which dips below linear before a hard landing.</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">Print</dt>
            <dd className="mt-2">Full bleed, full contrast. The scrim and the nav settle; caption and call to action arrive last.</dd>
          </div>
        </dl>
        <p className="mt-10 text-xs text-muted-foreground">
          One ScrollTrigger publishes one progress value; every effect is a window of it. The dissolve is an authored WebGL shader rendered only when the
          scroll moves, and a fine pointer develops the print where it rests. Under prefers-reduced-motion this page is the finished print, static.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          The ease control takes any atlas name (ink, lusion, osmo, ease-out, ease-in-out, drawer, expo.out, power4.out, power3.out, power2.out,
          power2.inOut, expo.inOut, m3.standard), a cubic-bezier() string, or a GSAP ease name.
        </p>
      </section>
    </div>
  )
}
