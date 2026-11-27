import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cross-origin isolation lets the solver share memory between workers and use every core. The server sends the same.
const ISOLATED = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' }, // the solver worker loads WebAssembly with import.meta.url
  // `npm run dev` forwards /api to the local Python backend (uvicorn, :8000 unless API_PORT is set).
  server: { headers: ISOLATED, proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8000}` } },
  preview: { headers: ISOLATED },
})
