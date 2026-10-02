import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const frontendDir = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(frontendDir, 'public')

// Flask backend that the dev and preview servers forward API traffic to. Override
// with VITE_DEV_API (shell variable or frontend/.env, see .env.example).
const API = loadEnv('development', frontendDir, 'VITE_').VITE_DEV_API || 'http://localhost:8000'

// A production build ships frontend/public, while Flask serves its own frontend/static.
// Where both hold a /static file, let the public/ copy win so dev and preview show what
// production shows; everything else (achievement badges, project templates, ...) still
// comes from the backend. Returning a URL makes Vite serve it instead of proxying.
const servePublicFirst = (req) => {
  try {
    const file = path.join(publicDir, decodeURIComponent(req.url.split('?')[0]))
    if (file.startsWith(publicDir + path.sep) && fs.statSync(file).isFile()) return req.url
  } catch {
    // Not in public/ (or a malformed URL): let the backend answer.
  }
}

// Only prefixes the frontend requests belong here. Everything under /api (admin,
// achievements, dev-login, project-templates, session, ...) is already covered by '/api'.
const proxy = {
  '/api': API,
  '/message': API,
  '/user': API,
  '/challenge': API,
  '/duck_trade': API,
  '/notes': API,
  // No direct frontend caller, but the backend returns stored-file URLs under /upload/uploads/.
  '/upload': API,
  '/static': { target: API, changeOrigin: true, bypass: servePublicFirst },
  '/socket.io': {
    target: API,
    ws: true,
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate cached chunks.
        // Each chunk is independently cached — an app code change no longer
        // busts the MUI / react-admin / chart.js cache in the browser.
        //
        // Function form on purpose: the object form drags every transitive
        // dependency of a listed package into its chunk, so react/jsx-runtime
        // landed in vendor-charts and @tanstack/react-query (imported eagerly by
        // main.jsx) in vendor-react-admin. Every page then statically imported
        // the admin/chart/MUI stack (~300 kB gzip) and /login preloaded it all.
        // Here each module is assigned by package path, so only the packages the
        // app shell needs (react, react-dom, react-router, react-query) sit in
        // the eagerly loaded vendor-react chunk; the others are lazy-only.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@tanstack)\//.test(id)) return 'vendor-react'
          if (/node_modules\/(@mui|@emotion)\//.test(id)) return 'vendor-mui'
          if (/node_modules\/(chart\.js|react-chartjs-2|@kurkle)\//.test(id)) return 'vendor-charts'
          if (/node_modules\/(react-admin|ra-[a-z0-9-]+)\//.test(id)) return 'vendor-react-admin'
          if (/node_modules\/emoji-picker-react\//.test(id)) return 'vendor-emoji'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules', 'dist', 'tests-e2e/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests-e2e/**',
        'tests/**',
        'static/**',
        'coverage/**',
        'src/test/**',
        '**/*.config.*',
        'src/main.jsx',
        'src/pages/Error/ServerOffline.jsx',
        'src/components/common/SmartImage.jsx',
        'src/pages/General/CourseLevelBreakdown.jsx',
        'src/pages/General/History.jsx',
        'src/pages/General/Landing.jsx',
        'src/pages/General/LandingDesktop.jsx',
        'src/pages/General/LandingMobile.jsx',
        'src/hooks/useViewport.js',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 55,
      },
    },
  },
  server: { proxy },
  // `vite preview` serves the production build (port 4173) and needs the same backend routes.
  preview: { proxy },
})
