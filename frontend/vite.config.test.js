import { describe, it, expect } from 'vitest'
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
