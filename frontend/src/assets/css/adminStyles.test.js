// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Guards for the admin stylesheets (issues #76 and #78): custom properties must resolve, colours come from tokens,
// the admin layers keep their order on the shared z-index scale, and the dark log console stays readable.
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

// Every `selector { declarations }` pair, including the ones inside @media/@supports blocks.
const rulesOf = (text) => [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }))
const declarationsOf = (body) =>
  body
    .replace(/url\((['"]?)[^)]*\1\)/g, 'url()')
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d.includes(':'))
    .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()])

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

  it('puts every admin z-index on the shared scale, or on a small local layer inside a component', () => {
    const offenders = []
    for (const path of Object.keys(css).filter(isAdminSheet)) {
      for (const { selector, body } of rulesOf(sheet(path))) {
        for (const [prop, value] of declarationsOf(body)) {
          if (prop !== 'z-index') continue
          const token = value.match(/^var\((--z-[\w-]+)\)$/)?.[1]
          const isLocalLayer = /^[0-9]$/.test(value)
          if (!(token && token in tokens) && !isLocalLayer) offenders.push(`${path.replace('/src/', '')}: ${selector} { z-index: ${value} }`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('stacks in-page menus below the rail, and the Classes modal and the kiosk below the toasts', () => {
    const z = (path, selector) => Number(resolveToken(declaration(ruleBody(sheet(path), selector), 'z-index')))
    const rail = z('/src/components/Layout/AdminLayout.css', '.admin-sidebar')
    const toast = Number(tokens['--z-toast'])

    // Menus open over their own page but never over the drawer, its overlay or a dialog
    expect(z('/src/pages/Admin/Users.css', '.kebab-dropdown')).toBeLessThan(rail)
    expect(z('/src/components/admin/ColumnFilterDropdown.css', '.column-filter-dropdown')).toBeLessThan(rail)
    expect(z('/src/pages/Admin/AdminAssignProject.css', '.aap-dropdown')).toBeLessThan(rail)

    // The Classes modal covers the rail, and the kiosk page lets toasts (its upload progress) show above it
    expect(z('/src/pages/Admin/Classes.css', '.modal-overlay')).toBeGreaterThan(rail)
    expect(z('/src/pages/Admin/Classes.css', '.modal-overlay')).toBeLessThan(toast)
    expect(z('/src/pages/Admin/KioskUpload.css', '.kiosk-container')).toBeLessThan(toast)
  })

  it('draws keyboard focus with the shared ring and never drops the outline without drawing one elsewhere', () => {
    const weakFocusRules = []
    const droppedOutlines = []
    for (const path of Object.keys(css).filter(isAdminSheet)) {
      for (const { selector, body } of rulesOf(sheet(path))) {
        const decls = Object.fromEntries(declarationsOf(body))
        const label = `${path.replace('/src/', '')}: ${selector.replace(/\s+/g, ' ')}`
        // A :focus rule (not :focus-visible/:focus-within) must use the ring, as the global input:focus rule does
        if (/:focus(?![-\w])/.test(selector) && decls['box-shadow'] !== 'var(--focus-ring)') weakFocusRules.push(label)
        if (/^(none|0)$/.test(decls.outline ?? '')) droppedOutlines.push(label)
      }
    }
    expect(weakFocusRules).toEqual([])
    // The one exception: the library card button hands its ring to the card around it (checked next)
    expect(droppedOutlines).toEqual(['pages/Admin/AdminStandardProjects.css: .project-card-open:focus-visible'])
    expect(sheet('/src/pages/Admin/AdminStandardProjects.css')).toMatch(
      /\.project-card:has\(\.project-card-open:focus-visible\)\s*\{[^}]*outline:\s*2px solid/,
    )
  })

  it('keeps admin media queries on the three shared breakpoints', () => {
    // Phones, tablets (where the rail becomes a drawer) and narrow desktops. A min-width is the next pixel up, so
    // no width falls in both a max-width and a min-width block.
    const maxWidths = [640, 800, 1024]
    const minWidths = maxWidths.map((px) => px + 1)
    const offenders = []
    for (const path of Object.keys(css).filter(isAdminSheet)) {
      for (const [, kind, px] of sheet(path).matchAll(/\((max|min)-width:\s*(\d+)px\)/g)) {
        if (!(kind === 'max' ? maxWidths : minWidths).includes(Number(px))) offenders.push(`${path.replace('/src/', '')}: (${kind}-width: ${px}px)`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the create-classroom modal rules in Classes.css, not in the class dashboard sheet', () => {
    // The dashboard never renders .modal-overlay/.modal-card, but unscoped rules for them restyled the Classes modal
    // (a translucent card, and a dark one on dark-OS devices under that modal's dark heading text).
    expect(sheet('/src/pages/Admin/AdminClassDashboard.css')).not.toMatch(/\.modal-(overlay|card)\b/)
    expect(sheet('/src/pages/Admin/Classes.css')).toMatch(/\.modal-overlay\s*\{/)
    expect(sheet('/src/pages/Admin/Classes.css')).toMatch(/\.modal-card\s*\{/)
  })

  it('has no prefers-color-scheme overrides, since the app has no dark theme', () => {
    const withDarkRules = Object.keys(css).filter((path) => isAdminSheet(path) && /prefers-color-scheme/.test(sheet(path)))
    expect(withDarkRules).toEqual([])
  })

  it('draws the parent-message badge and avatar from shared tokens with AA contrast', () => {
    const review = sheet('/src/pages/Admin/ToReview.css')
    const badge = ruleBody(review, '.badge-parent-message')
    expect(declaration(badge, 'color')).toMatch(/^var\(--/)
    expect(declaration(badge, 'background')).toMatch(/^var\(--/)
    expect(
      contrast(resolveToken(declaration(badge, 'color')), resolveToken(declaration(badge, 'background'))),
    ).toBeGreaterThanOrEqual(4.5)

    // The avatar glyph is white on a two-stop gradient: both stops need the contrast
    const avatar = ruleBody(review, '.avatar-placeholder.parent-avatar')
    const stops = declaration(avatar, 'background').match(/var\(--[\w-]+\)/g)
    expect(stops).toHaveLength(2)
    for (const stop of stops) {
      expect(contrast(resolveToken(declaration(avatar, 'color')), resolveToken(stop)), stop).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('writes colours as tokens, not raw hex or white/black literals', () => {
    // A var() fallback is ignored when its token is defined, so only one on an undefined token counts as a literal.
    const withoutDeadFallbacks = (value) =>
      value.replace(/var\(\s*(--[\w-]+)\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/g, (whole, name) =>
        name in definitions ? `var(${name})` : whole,
      )
    const literal = /#[0-9a-f]{3,8}\b|\b(?:white|black)\b/i

    const offenders = []
    for (const path of Object.keys(css).filter(isAdminSheet)) {
      for (const { selector, body } of rulesOf(sheet(path))) {
        for (const [prop, value] of declarationsOf(body)) {
          // `--name: #hex` is the token definition itself
          if (!prop.startsWith('--') && literal.test(withoutDeadFallbacks(value))) {
            offenders.push(`${path.replace('/src/', '')}: ${selector} { ${prop}: ${value} }`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
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
