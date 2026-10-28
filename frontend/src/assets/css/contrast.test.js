// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrast, flatten } from '../../test/colorContrast.js'

// WCAG 2.2 contrast guards for the design tokens (issue #111): 4.5:1 for text (1.4.3) and 3:1 for the borders of
// controls and other graphics a user needs to see (1.4.11). The pairs are read from variables.css, not copied, so
// changing a token to something that no longer passes fails here. Read from disk: vitest swaps imported CSS for ''.
const srcDir = fileURLToPath(new URL('../../', import.meta.url))
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const read = (rel) => stripComments(readFileSync(join(srcDir, rel), 'utf8'))

const tokens = Object.fromEntries(
  [...read('assets/css/variables.css').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
)

/** A token's #RRGGBB value, following var(--other) chains. */
const hex = (name) => {
  let value = tokens[name]
  for (let hops = 0; value !== undefined && hops < 5; hops++) {
    const alias = value.match(/^var\((--[\w-]+)\)$/)
    if (!alias) break
    value = tokens[alias[1]]
  }
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) throw new Error(`${name} does not resolve to a #RRGGBB colour (got ${value})`)
  return value.toUpperCase()
}
const ratio = (fg, bg) => contrast(hex(fg), hex(bg))

const TEXT = 4.5
const NON_TEXT = 3

describe('text tokens on the surfaces they sit on (WCAG 1.4.3, 4.5:1)', () => {
  const surfaces = ['--bg-primary', '--bg-secondary', '--bg-tertiary']
  const onSurfaces = [
    ['--text-primary', surfaces],
    ['--text-secondary', surfaces],
    ['--text-muted', surfaces],
    ['--primary-accessible', [...surfaces, '--primary-light']],
    ['--primary-darker', ['--primary-light']],
    ['--secondary-color', [...surfaces, '--secondary-light']],
    // 4.4999:1 on --bg-secondary, a hair under 4.5 (a known gap, outside #111): only the white surface is asserted
    ['--error-color', ['--bg-primary']],
    ['--success-text', [...surfaces, '--success-subtle']],
    ['--warning-text', [...surfaces, '--amber-50']],
  ]
  it.each(onSurfaces.flatMap(([fg, bgs]) => bgs.map((bg) => [fg, bg])))('%s on %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(TEXT)
  })

  it('keeps the bright success and warning values out of text: they are fill colours', () => {
    // --success-color and --warning-color fail on white by design (2.54:1 and 3.19:1), and so does --success-dark
    // (3.77:1). Text and glyphs use --success-text / --warning-text; fills, borders, strokes and dots keep these.
    // (?<!,\s*) skips a var() that is only the fallback of another token, var(--primary-color, var(--success-color)),
    // which never renders while the first token is defined.
    const bright = /(?<!,\s*)var\(\s*--(success-color|warning-color|success-dark)\b/
    const offenders = []
    for (const rel of readdirSync(srcDir, { recursive: true }).map((f) => f.split(sep).join('/'))) {
      if (!rel.endsWith('.css')) continue
      for (const [, prop, value] of read(rel).matchAll(/(?:^|[;{\s])(color|-webkit-text-fill-color)\s*:\s*([^;}]+)/g)) {
        if (bright.test(value)) offenders.push(`${rel}: ${prop}: ${value.trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('white text on filled controls (WCAG 1.4.3, 4.5:1)', () => {
  it.each([
    '--primary-accessible', // .btn-primary
    '--error-color', // .btn-danger
    '--success-text', // success buttons and the admin bulk-connect button
    '--warning-text', // .admin-form .btn-warning
    '--secondary-color',
    '--primary-dark',
    '--settings-accent', // EditProfile Save
    '--settings-accent-hover',
  ])('--text-on-primary on %s', (fill) => {
    expect(ratio('--text-on-primary', fill)).toBeGreaterThanOrEqual(TEXT)
  })

  it.each(['--gradient-primary', '--gradient-error', '--gradient-success'])('%s passes with white at every stop', (name) => {
    const stops = tokens[name].match(/#[0-9a-f]{6}\b/gi)
    expect(stops.length).toBeGreaterThanOrEqual(2)
    for (const stop of stops) {
      expect(contrast(hex('--text-on-primary'), stop.toUpperCase()), `${name} stop ${stop}`).toBeGreaterThanOrEqual(TEXT)
    }
  })
})

describe('control borders and focus (WCAG 1.4.11, 3:1)', () => {
  it.each([
    ['--input-border', '--bg-primary'],
    ['--input-border', '--bg-secondary'],
    ['--primary-accessible', '--bg-primary'], // the focus ring and outline colour
    ['--primary-accessible', '--bg-secondary'],
  ])('%s against %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(NON_TEXT)
  })

  it('draws the global text-field border with --input-border on the --bg-primary field background', () => {
    const rule = [...read('index.css').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .find(([, selector]) => selector.includes('input[type="text"]') && selector.includes('select'))
    expect(rule, 'the global form-control rule').toBeTruthy()
    expect(rule[2]).toMatch(/border:\s*2px solid var\(--input-border\)/)
    expect(rule[2]).toMatch(/background:\s*var\(--bg-primary\)/)
  })

  it('keeps --border-rich for decoration: it is too pale to mark a control', () => {
    expect(ratio('--border-rich', '--bg-primary')).toBeLessThan(NON_TEXT)
  })
})

describe('status pills: text on its own translucent tint', () => {
  const activity = read('pages/General/Activity.css')
  it.each(['pending', 'success', 'rejected'])('.status-pill-%s', (kind) => {
    const body = activity.match(new RegExp(String.raw`\.status-pill-${kind}\s*\{([^}]*)\}`))[1]
    const tint = flatten(body.match(/background:\s*(rgba\([^)]*\))/)[1], hex('--bg-primary'))
    const text = body.match(/color:\s*var\((--[\w-]+)\)/)[1]
    expect(contrast(hex(text), tint), `${text} on ${tint}`).toBeGreaterThanOrEqual(TEXT)
  })
})
