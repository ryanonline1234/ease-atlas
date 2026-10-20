import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'playground',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5178, strictPort: true },
  // Pre-bundle every runtime dep up front: a dep discovered mid-session makes Vite reload the
  // page, which a probe sees as the component vanishing for a moment.
  optimizeDeps: { include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'gsap', 'gsap/ScrollTrigger', '@gsap/react', 'lenis', 'lenis/snap'] },
  test: {
    root: '.',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
