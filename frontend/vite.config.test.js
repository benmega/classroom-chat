import { describe, it, expect, vi, afterEach } from 'vitest'
import config from './vite.config.js'

// Guards the route-level code splitting: the student entry path (index.html) must only
// pull in vendor-react, never the admin / chart / MUI stack. See the manualChunks comment.
const manualChunks = config.build.rollupOptions.output.manualChunks
const dep = (pkg, file = 'index.js') => `C:/repo/frontend/node_modules/${pkg}/${file}`

describe('vite manualChunks', () => {
  it('leaves application source and virtual modules to Rollup', () => {
    expect(manualChunks('C:/repo/frontend/src/App.jsx')).toBeUndefined()
    expect(manualChunks('\0vite/preload-helper.js')).toBeUndefined()
  })

  it.each([
    ['react', 'index.js'],
    ['react', 'jsx-runtime.js'],
    ['react-dom', 'client.js'],
    ['react-router', 'dist/index.js'],
    ['react-router-dom', 'dist/index.js'],
    ['scheduler', 'index.js'],
    ['@tanstack/react-query', 'build/modern/index.js'],
    ['@tanstack/query-core', 'build/modern/index.js'],
  ])('puts %s/%s in the eagerly loaded vendor-react chunk', (pkg, file) => {
    expect(manualChunks(dep(pkg, file))).toBe('vendor-react')
  })

  it('keeps commonjs interop modules of the eager packages in vendor-react', () => {
    expect(manualChunks(`\0${dep('react')}?commonjs-module`)).toBe('vendor-react')
    expect(manualChunks(`\0${dep('react-dom', 'client.js')}?commonjs-exports`)).toBe('vendor-react')
  })

  it.each([
    ['@mui/material', 'vendor-mui'],
    ['@mui/icons-material', 'vendor-mui'],
    ['@emotion/react', 'vendor-mui'],
    ['@emotion/styled', 'vendor-mui'],
    ['chart.js', 'vendor-charts'],
    ['react-chartjs-2', 'vendor-charts'],
    ['@kurkle/color', 'vendor-charts'],
    ['react-admin', 'vendor-react-admin'],
    ['ra-core', 'vendor-react-admin'],
    ['ra-i18n-polyglot', 'vendor-react-admin'],
    ['emoji-picker-react', 'vendor-emoji'],
  ])('keeps %s in its lazy-only %s chunk', (pkg, chunk) => {
    expect(manualChunks(dep(pkg))).toBe(chunk)
  })

  it('assigns react-admin\'s nested dependencies to vendor-react-admin', () => {
    expect(manualChunks(dep('react-admin/node_modules/ra-ui-materialui', 'dist/index.js'))).toBe('vendor-react-admin')
  })

  it.each(['react-hot-toast', 'react-dropzone', 'react-hook-form', 'zustand', 'axios', 'lucide-react'])(
    'does not mistake %s for a react core package',
    (pkg) => {
      expect(manualChunks(dep(pkg))).toBeUndefined()
    },
  )
})

// Re-evaluates the config so the VITE_DEV_API handling can be exercised ('' = unset).
const loadConfig = async (devApi = '') => {
  vi.resetModules()
  vi.stubEnv('VITE_DEV_API', devApi)
  return (await import('./vite.config.js')).default
}
const targetOf = (entry) => (typeof entry === 'string' ? entry : entry.target)

describe('vite dev/preview proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('shares one proxy between the dev server and vite preview', async () => {
    const { server, preview } = await loadConfig()
    expect(preview.proxy).toBe(server.proxy)
  })

  it('only lists the backend prefixes the frontend uses, without /api sub-paths or dead routes', async () => {
    const { server } = await loadConfig()
    expect(Object.keys(server.proxy).sort()).toEqual([
      '/api',
      '/challenge',
      '/duck_trade',
      '/message',
      '/notes',
      '/socket.io',
      '/static',
      '/upload',
      '/user',
    ])
  })

  it('forwards every prefix to http://localhost:8000 by default', async () => {
    const { server } = await loadConfig()
    expect(new Set(Object.values(server.proxy).map(targetOf))).toEqual(new Set(['http://localhost:8000']))
  })

  it('lets VITE_DEV_API retarget every prefix at once', async () => {
    const { server } = await loadConfig('http://localhost:9100')
    expect(new Set(Object.values(server.proxy).map(targetOf))).toEqual(new Set(['http://localhost:9100']))
  })

  it('keeps websocket upgrades and origin rewriting on the Socket.IO entry', async () => {
    const { server } = await loadConfig()
    expect(server.proxy['/socket.io']).toMatchObject({ ws: true, changeOrigin: true })
  })
})

describe('vite /static proxy bypass', () => {
  const req = (url) => ({ url })
  const bypass = async () => (await loadConfig()).server.proxy['/static'].bypass

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('serves files that exist in frontend/public instead of proxying them', async () => {
    const fn = await bypass()
    expect(fn(req('/static/images/Default_pfp.jpg'))).toBe('/static/images/Default_pfp.jpg')
    expect(fn(req('/static/sounds/quack.mp3'))).toBe('/static/sounds/quack.mp3')
  })

  it('keeps the query string when it serves a public file', async () => {
    const fn = await bypass()
    expect(fn(req('/static/images/Default_pfp.jpg?v=2'))).toBe('/static/images/Default_pfp.jpg?v=2')
  })

  it('proxies files that only the backend has (achievement badges, project templates)', async () => {
    const fn = await bypass()
    expect(fn(req('/static/images/achievement_badges/10-messages.png'))).toBeUndefined()
    expect(fn(req('/static/images/bit_shift.png'))).toBeUndefined()
  })

  it('proxies directories and unknown paths', async () => {
    const fn = await bypass()
    expect(fn(req('/static/images'))).toBeUndefined()
    expect(fn(req('/static/'))).toBeUndefined()
    expect(fn(req('/static/nope.png'))).toBeUndefined()
  })

  it('never serves files outside frontend/public', async () => {
    const fn = await bypass()
    expect(fn(req('/static/../package.json'))).toBeUndefined()
    expect(fn(req('/static/%2e%2e/package.json'))).toBeUndefined()
  })

  it('proxies malformed URLs instead of throwing', async () => {
    const fn = await bypass()
    expect(fn(req('/static/%E0%A4%A'))).toBeUndefined()
  })
})
