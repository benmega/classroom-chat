// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The rail labels appear on hover; a keyboard user who tabs to a rail icon must get the same label (WCAG 1.4.13).
// Read from disk: vitest swaps imported CSS for an empty string.
const srcDir = fileURLToPath(new URL('../../', import.meta.url))
const read = (rel) => readFileSync(join(srcDir, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('rail tooltips', () => {
  it.each([
    ['components/Layout/Layout.css', '.nav-rail-item[data-tooltip]'],
    ['components/Layout/AdminLayout.css', '.admin-rail-item[data-tooltip]'],
    ['components/Layout/AdminLayout.css', '.admin-rail-logo[data-tooltip]'],
  ])('%s shows %s on keyboard focus as well as hover', (rel, base) => {
    const css = read(rel)
    for (const part of ['::after', '::before']) {
      const shown = css.split('{').map((chunk, i, all) => (i < all.length - 1 ? all[i].split('}').pop() : ''))
      const rule = shown.find((selectors) => selectors.includes(`${base}:hover${part}`))
      expect(rule, `${base}:hover${part}`).toBeTruthy()
      expect(rule).toContain(`${base}:focus-visible${part}`)
    }
  })
})
