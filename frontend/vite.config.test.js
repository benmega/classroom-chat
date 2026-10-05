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

describe('lucide per-icon import rewrite', () => {
  const plugin = config.plugins.flat().find((p) => p.name === 'optimize-lucide')

  // In dev the dependency scanner pre-bundles the barrel from the original source, so rewriting to
  // per-icon paths there makes Vite re-optimize and reload the page while it is loading.
  it('only runs for production builds', () => {
    expect(plugin.apply).toBe('build')
  })

  it('rewrites named imports to per-icon paths, keeping aliases and dropping the Icon suffix', () => {
    const out = plugin.transform("import { Send, ArrowRightIcon, Gamepad2 as Pad } from 'lucide-react'", 'C:/repo/frontend/src/A.jsx')
    expect(out).toBe([
      "import Send from 'lucide-react/dist/esm/icons/send';",
      "import ArrowRightIcon from 'lucide-react/dist/esm/icons/arrow-right';",
      "import Pad from 'lucide-react/dist/esm/icons/gamepad-2';",
    ].join('\n'))
  })

  it('leaves dependencies and files without lucide imports alone', () => {
    expect(plugin.transform("import { Send } from 'lucide-react'", 'C:/repo/frontend/node_modules/x/index.js')).toBeUndefined()
    expect(plugin.transform("import { useState } from 'react'", 'C:/repo/frontend/src/A.jsx')).toBeUndefined()
  })
})

// Re-evaluates the config so the VITE_DEV_API handling can be exercised ('' = unset).
const loadConfig = async (devApi = '') => {
  vi.resetModules()
  vi.stubEnv('VITE_DEV_API', devApi)
  return (await import('./vite.config.js')).default
}
const targetOf = (entry) => (typeof entry === 'string' ? entry : entry.target)
// The proxy entry a request URL is forwarded by, chosen the way Vite does it: a key starting with
// ^ is a RegExp, any other key a plain string prefix. Undefined means Vite serves the URL itself.
const entryFor = (proxy, url) => {
  const key = Object.keys(proxy).find((k) => (k[0] === '^' && new RegExp(k).test(url)) || url.startsWith(k))
  return key === undefined ? undefined : proxy[key]
}
// '^/socket\\.io(/|\\?|$)' -> '/socket.io'
const nameOf = (key) => key.slice(1).replace(/\(.*$/, '').replace(/\\/g, '')

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
    expect(Object.keys(server.proxy).map(nameOf).sort()).toEqual([
      '/api',
      '/challenge',
      '/duck_trade',
      '/message',
      '/notes',
      '/socket.io',
      '/static',
      '/user',
    ])
  })

  // A plain '/user' key is a string prefix, so it also took '/users' away from the SPA (a refresh
  // there got the backend's answer instead of the app).
  it.each(['/api', '/challenge', '/duck_trade', '/message', '/notes', '/socket.io', '/static', '/user'])(
    'forwards %s, its sub-paths and its query string, and nothing that merely starts with it',
    async (name) => {
      const { server } = await loadConfig()
      const entry = entryFor(server.proxy, name)
      expect(entry).toBeDefined()
      for (const url of [name, `${name}/`, `${name}/a/b.png`, `${name}?x=1`, `${name}/?x=1`]) {
        expect(entryFor(server.proxy, url)).toBe(entry)
      }
      for (const url of [`${name}s`, `${name}s/1`, `${name}-old`, `${name}_x/1`, `${name}x?x=1`]) {
        expect(entryFor(server.proxy, url)).toBeUndefined()
      }
    },
  )

  it('leaves the SPA routes whose paths start like a backend prefix to the dev server', async () => {
    const { server } = await loadConfig()
    for (const url of ['/users', '/users?role=student', '/messages', '/challenges', '/notes-archive', '/profile', '/admin/users', '/apis']) {
      expect(entryFor(server.proxy, url)).toBeUndefined()
    }
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
    expect(entryFor(server.proxy, '/socket.io/?EIO=4&transport=websocket')).toMatchObject({ ws: true, changeOrigin: true })
  })
})

describe('vite /static proxy bypass', () => {
  const req = (url) => ({ url })
  const bypass = async () => entryFor((await loadConfig()).server.proxy, '/static/x').bypass

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

describe('vite /user/profile page-navigation bypass', () => {
  const nav = (url) => ({ url, headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } })
  const api = (url) => ({ url, headers: { accept: 'application/json, text/plain, */*' } })
  const bypass = async () => entryFor((await loadConfig()).server.proxy, '/user/profile/x').bypass

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // /user/profile/:slug is an SPA route too (printed QR links), so a refresh must return the app
  it('serves the app for a browser navigation to a profile link', async () => {
    const fn = await bypass()
    expect(fn(nav('/user/profile/some-slug'))).toBe('/user/profile/some-slug')
    expect(fn(nav('/user/profile/some.slug%20x?ref=qr'))).toBe('/user/profile/some.slug%20x?ref=qr')
  })

  it('still proxies the API call for the same path', async () => {
    const fn = await bypass()
    expect(fn(api('/user/profile/some-slug'))).toBeUndefined()
    expect(fn({ url: '/user/profile/some-slug', headers: {} })).toBeUndefined()
  })

  it('proxies every other /user path, whatever the request accepts', async () => {
    const fn = await bypass()
    for (const url of ['/user/profile', '/user/profile_pictures/a.jpg', '/user/login', '/user/api/auth/status']) {
      expect(fn(nav(url))).toBeUndefined()
    }
  })
})
