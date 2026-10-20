import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const demos = {
  'ease-atlas': lazy(() => import('../src/demos/ease-atlas/default')),
  'ink-hero': lazy(() => import('../src/demos/ink-hero/default')),
  'ink-reveal': lazy(() => import('../src/demos/ink-reveal/default')),
  'ink-ridges': lazy(() => import('../src/demos/ink-ridges/default')),
} as const
type DemoName = keyof typeof demos

const params = new URLSearchParams(location.search)
const name = (params.get('demo') ?? 'ink-hero') as DemoName
const Demo = demos[name] ?? demos['ink-hero']
// probe hook: every query param except demo/dark becomes a demo prop (numbers and booleans
// coerced), e.g. ?imageSrc= for the hero's no-image mode or ?trigger=manual&progress=0.4
const coerce = (v: string): string | number | boolean =>
  v === 'true' ? true : v === 'false' ? false : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v
const demoProps: Record<string, string | number | boolean> = Object.fromEntries(
  [...params.entries()].filter(([k]) => k !== 'demo' && k !== 'dark').map(([k, v]) => [k, coerce(v)]),
)

function Shell() {
  return (
    <>
      <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 font-mono text-[11px]">
        {(Object.keys(demos) as DemoName[]).map((d) => (
          <a
            key={d}
            href={`?demo=${d}${document.documentElement.classList.contains('dark') ? '&dark=1' : '&dark=0'}`}
            className={`rounded-md border border-border px-2 py-1 ${d === name ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
          >
            {d}
          </a>
        ))}
        <button
          type="button"
          className="rounded-md border border-border bg-card px-2 py-1 text-muted-foreground"
          onClick={() => document.documentElement.classList.toggle('dark')}
        >
          theme
        </button>
      </nav>
      <Suspense fallback={null}>
        <Demo {...demoProps} />
      </Suspense>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
