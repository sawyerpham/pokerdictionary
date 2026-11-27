import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' }, // the solver worker loads WebAssembly with import.meta.url
  // `npm run dev` forwards /api to the local Python backend (uvicorn, :8000 unless API_PORT is set).
  server: { proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8000}` } },
})
