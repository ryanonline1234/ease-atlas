'use client'

import { useState } from 'react'
// A relative import: the 21st CLI rewrites it to wherever its build places the component file.
import InkRidges from '../../components/ui/ink-ridges'

const settings = {
  layers: 4,
  seed: 7,
  horizon: 0.62,
  mist: 0.6,
  drift: 0.05,
  parallax: 0.03,
  paintIn: 2600,
  sun: true,
  sunColor: '#b5402a',
  grain: 0.3,
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  const [bump, setBump] = useState(0)
  const seed = s.seed + bump
  return (
    <div className="bg-background text-foreground">
      <InkRidges
        layers={s.layers}
        seed={seed}
        horizon={s.horizon}
        mist={s.mist}
        drift={s.drift}
        parallax={s.parallax}
        paintIn={s.paintIn}
        sun={s.sun}
        sunColor={s.sunColor}
        grain={s.grain}
        label="An ink landscape of layered mountain ridges in mist, painted by code"
        className="h-[82svh] min-h-[520px] w-full bg-background"
      >
        <div className="max-w-xl p-6 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ink ridges · seed {seed}</p>
          <h1 className="mt-4 font-serif text-5xl font-normal leading-[0.98] tracking-[-0.02em] md:text-7xl">
            Mountains,
            <br />
            painted in place.
          </h1>
          <p className="mt-5 max-w-sm text-sm text-muted-foreground">
            Every seed paints a different range. Ink thins toward each foot and mist drifts between the ridges.
          </p>
          <button
            type="button"
            id="paint-another-range"
            onClick={() => setBump((b) => b + 1)}
            className="mt-6 rounded-full border border-foreground/25 bg-background/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] backdrop-blur-sm transition-colors duration-150 hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Paint another range
          </button>
        </div>
      </InkRidges>
      <section className="mx-auto flex min-h-[120svh] max-w-3xl flex-col justify-center px-6 py-24 md:px-10">
        <h2 className="font-serif text-3xl leading-tight">A range, not a picture.</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing here is an image. Each ridge is a line of noise brushed in from the left, far ridge first; the ink thins toward its foot, and
          mist lifts out of it and drifts. The landscape draws only while something moves, takes the paper and ink from your theme, and under
          prefers-reduced-motion it is one finished, still frame.
        </p>
      </section>
    </div>
  )
}
