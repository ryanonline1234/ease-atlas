'use client'

// A relative import: the 21st CLI rewrites it to wherever its build places the component file.
import InkReveal, { type Origin, type Trigger } from '../../components/ui/ink-reveal'

const settings = {
  trigger: 'hover',
  origin: 'pointer',
  ease: 'ink',
  duration: 900,
  progress: 0.5,
  rest: 0.2,
  feather: 0.14,
  grain: 0.3,
  noiseScale: 5,
  inkColor: '#1b1613',
}

const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb'
const WORKS = [
  {
    slug: 'pine-trees-right',
    title: 'Pine Trees, right screen',
    by: 'Hasegawa Tōhaku, late 16th c.',
    src: `${WIKI}/2/23/Hasegawa_Tohaku_-_Pine_Trees_%28Sh%C5%8Drin-zu_by%C5%8Dbu%29_-_right_hand_screen.jpg/960px-Hasegawa_Tohaku_-_Pine_Trees_%28Sh%C5%8Drin-zu_by%C5%8Dbu%29_-_right_hand_screen.jpg`,
    alt: 'Pine trees emerging from mist, painted in ink on a folding screen',
  },
  {
    slug: 'splashed-ink-landscape',
    title: 'Splashed-ink landscape',
    by: 'Sesshū Tōyō, 1495',
    src: `${WIKI}/2/27/Sesshu_-_Haboku-Sansui.jpg/960px-Sesshu_-_Haboku-Sansui.jpg`,
    alt: 'A mountain landscape in loose splashed ink, with a building and a figure in a boat',
  },
  {
    slug: 'pine-trees-left',
    title: 'Pine Trees, left screen',
    by: 'Hasegawa Tōhaku, late 16th c.',
    src: `${WIKI}/3/32/Hasegawa_Tohaku_-_Pine_Trees_%28Sh%C5%8Drin-zu_by%C5%8Dbu%29_-_left_hand_screen.jpg/960px-Hasegawa_Tohaku_-_Pine_Trees_%28Sh%C5%8Drin-zu_by%C5%8Dbu%29_-_left_hand_screen.jpg`,
    alt: 'Pine trees and a distant snowy peak in ink, from the left folding screen',
  },
  {
    slug: 'winter-landscape',
    title: 'Landscape of Four Seasons: Winter',
    by: 'attributed to Sesshū Tōyō, 15th c.',
    src: `${WIKI}/e/ea/Sesshu_Toyo_-_Landscape_of_four_seasons-_winter_-_Google_Art_Project.jpg/960px-Sesshu_Toyo_-_Landscape_of_four_seasons-_winter_-_Google_Art_Project.jpg`,
    alt: 'A winter landscape in ink: cliffs, bare trees and a temple roof under snow',
  },
]

const HINT: Record<string, string> = {
  hover: 'Hover or tab to a print',
  inView: 'Scroll a print into view',
  manual: 'Scrub the progress control',
}

export default function Demo(props: Partial<typeof settings> & { src?: string }) {
  const s = { ...settings, ...props }
  return (
    <div className="min-h-screen w-full bg-background px-6 py-16 text-foreground md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ink reveal · {HINT[s.trigger] ?? HINT.hover}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.01em] md:text-5xl">Four prints, developed on contact.</h2>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            The ink blooms from where you come in and pools at its edge. All four cards draw through one WebGL context.
          </p>
        </header>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {WORKS.map((w) => (
            <li key={w.slug}>
              <a
                id={w.slug}
                href={`#${w.slug}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <InkReveal
                  src={props.src ?? w.src}
                  alt={w.alt}
                  trigger={s.trigger as Trigger}
                  origin={s.origin as Origin}
                  ease={s.ease}
                  duration={s.duration}
                  progress={s.progress}
                  rest={s.rest}
                  feather={s.feather}
                  grain={s.grain}
                  noiseScale={s.noiseScale}
                  inkColor={s.inkColor}
                  aspectRatio="3 / 4"
                  className="rounded-lg bg-background"
                />
                <p className="mt-3 font-serif text-lg leading-snug">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.by}</p>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-muted-foreground">All four works are in the public domain. Images from Wikimedia Commons.</p>
      </div>
    </div>
  )
}
