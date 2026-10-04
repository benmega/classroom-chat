// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Guards for the admin stylesheets (issue #76): custom properties must resolve, the admin
// layers keep their order on the shared z-index scale, and the dark log console stays readable.
// Read from disk: vitest swaps imported CSS (even ?raw) for an empty string.
const srcDir = fileURLToPath(new URL('../../', import.meta.url))
const cssPaths = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssPaths(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : [],
  )
const css = Object.fromEntries(
  cssPaths(srcDir).map((p) => ['/src/' + relative(srcDir, p).split(sep).join('/'), readFileSync(p, 'utf8')]),
)

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const sheet = (path) => stripComments(css[path])
const isAdminSheet = (path) => /\/pages\/Admin\/|\/components\/admin\/|\/Layout\/AdminLayout\.css$/.test(path)

// Every `--name: value;` declaration in the app's stylesheets (:root tokens and scoped ones).
const definitions = {}
for (const path of Object.keys(css)) {
  for (const [, name, value] of sheet(path).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    definitions[name] = value.trim()
  }
}
const tokens = Object.fromEntries(
  [...sheet('/src/assets/css/variables.css').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim()]),
)

const resolveToken = (value) => {
  let out = value.trim()
  for (let i = 0; i < 5; i++) {
    const m = out.match(/^var\((--[\w-]+)\)$/)
    if (!m) break
    out = tokens[m[1]] ?? m[1]
  }
  return out
}

// var(--name) uses with no fallback, i.e. the ones that break when --name is undefined.
const usesWithoutFallback = (text) => {
  const found = []
  const re = /var\(\s*(--[\w-]+)/g
  let m
  while ((m = re.exec(text))) {
    let depth = 0
    let hasFallback = false
    for (let i = m.index + 3; i < text.length; i++) {
      if (text[i] === '(') depth++
      else if (text[i] === ')' && --depth === 0) break
      else if (text[i] === ',' && depth === 1) hasFallback = true
    }
    if (!hasFallback) found.push(m[1])
  }
  return found
}

const ruleBody = (text, selector) => {
  for (const [, sel, body] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim().endsWith(selector)) return body
  }
  throw new Error(`rule not found: ${selector}`)
}
const declaration = (body, prop) => {
  const value = body.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`))?.[1]
  if (value === undefined) throw new Error(`no ${prop} declaration in: ${body.trim()}`)
  return value.trim()
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('admin stylesheets', () => {
  it('only use custom properties that are defined, or give a fallback', () => {
    const adminSheets = Object.keys(css).filter(isAdminSheet)
    expect(adminSheets.length).toBeGreaterThan(15)

    const undefinedUses = []
    for (const path of adminSheets) {
      for (const name of usesWithoutFallback(sheet(path))) {
        if (!(name in definitions)) undefinedUses.push(`${path.replace('/src/', '')}: ${name}`)
      }
    }
    expect(undefinedUses).toEqual([])
  })

  it('puts the admin rail and its mobile overlay on the shared z-index scale, below the shared modal', () => {
    const layout = '/src/components/Layout/AdminLayout.css'
    const zRule = (path, selector) => declaration(ruleBody(sheet(path), selector), 'z-index')

    // Declared with the scale tokens, not literals (a literal here is what issue #76 removed)
    expect(zRule(layout, '.admin-sidebar')).toBe('var(--z-sidebar)')
    expect(zRule(layout, '.admin-mobile-overlay')).toBe('var(--z-dropdown)')

    // ...and the layers keep their order: overlay < rail < modal. The log/stats/purge dialogs now use the
    // shared Modal, whose overlay deliberately stays above toasts (see --z-modal in variables.css).
    const z = (path, selector) => Number(resolveToken(zRule(path, selector)))
    const rail = z(layout, '.admin-sidebar')
    const overlay = z(layout, '.admin-mobile-overlay')
    const modal = z('/src/components/common/Modal.css', '.admin-modal-overlay')
    expect(overlay).toBeLessThan(rail)
    expect(rail).toBeLessThan(modal)
    expect(modal).toBeGreaterThan(Number(tokens['--z-modal']))
  })

  it('draws the log console text and its sub-text with AA contrast', () => {
    const panel = sheet('/src/pages/Admin/AdvancedPanel.css')
    const consoleBg = resolveToken(declaration(ruleBody(panel, '.advanced-modal-console'), 'background'))
    const colors = {
      'console text': declaration(ruleBody(panel, '.advanced-modal-console'), 'color'),
      'stat label': declaration(ruleBody(panel, '.advanced-modal-console .stat-box .label'), 'color'),
      'table row name': declaration(ruleBody(panel, '.advanced-modal-console .table-row span'), 'color'),
      'table row count': declaration(ruleBody(panel, '.advanced-modal-console .table-row strong'), 'color'),
    }

    for (const [what, value] of Object.entries(colors)) {
      expect(contrast(resolveToken(value), consoleBg), `${what} (${value})`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
