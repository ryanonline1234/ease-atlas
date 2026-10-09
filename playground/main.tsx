import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import Demo from '../src/demos/default'

function Shell() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-sm tracking-wide">ease-atlas / playground</h1>
          <p className="text-xs text-muted-foreground">Hover or focus a curve to ride it. Click to copy.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => document.documentElement.classList.toggle('dark')}
        >
          toggle theme
        </button>
      </header>
      <Demo />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
