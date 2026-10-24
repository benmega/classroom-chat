// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The users table has five columns, so a fixed minimum width on it pushes the Economy, Status and
// Actions columns off a phone screen (#96). Phones get cards instead. Read from disk: vitest swaps
// imported CSS for an empty string.
const css = readFileSync(fileURLToPath(new URL('./Users.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

// Every `selector { body }` rule with the media query it sits in ('' at the top level).
const rules = []
for (const [, query, inner] of css.matchAll(/@media\s*([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
  for (const [, selector, body] of inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push({ query: query.trim(), selector: selector.trim(), body })
}
const topLevel = css.replace(/@media\s*[^{]+\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, '')
for (const [, selector, body] of topLevel.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push({ query: '', selector: selector.trim(), body })

describe('Users.css', () => {
  it('never sets a minimum width on the users table', () => {
    const tableRules = rules.filter((r) => r.selector.split(',').some((s) => s.trim() === '.users-table' || s.trim().endsWith(' .users-table')))

    expect(tableRules.length).toBeGreaterThan(0)
    for (const rule of tableRules) expect(rule.body).not.toMatch(/min-width/)
  })

  it('turns the rows into flex cards on phones', () => {
    const phoneRow = rules.find((r) => r.query === '(max-width: 640px)' && r.selector === '.users-table tbody tr')

    expect(phoneRow?.body).toMatch(/display:\s*flex/)
  })
})
