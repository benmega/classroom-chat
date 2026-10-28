// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Every page App.jsx routes to sets its own document title (WCAG 2.4.2). Read from the sources: a page that forgets
// the hook would otherwise be called "Classroom Chat" in the tab, the history and a screen reader's page announcement.
const srcDir = fileURLToPath(new URL('../', import.meta.url))
const read = (rel) => readFileSync(join(srcDir, rel), 'utf8')

const app = read('App.jsx')
const routed = [...app.matchAll(/(?:import\(|from )'\.\/(pages\/[^']+)'/g)]
  .map(([, spec]) => [spec + '.jsx', spec + '/index.jsx'].find((rel) => existsSync(join(srcDir, rel))))

// Not covered yet: BitShift.jsx is also being edited by the auth-store change (checkAuth), so its two lines go in
// after that merges. Remove it from this list then.
const NOT_YET = new Set(['pages/General/BitShift.jsx'])

describe('page titles', () => {
  it('finds the routed pages', () => {
    expect(routed.length).toBeGreaterThan(35)
    expect(routed.every(Boolean)).toBe(true)
  })

  it.each(routed.filter((rel) => rel && !NOT_YET.has(rel)))('%s calls useDocumentTitle', (rel) => {
    expect(read(rel)).toMatch(/\buseDocumentTitle\(/)
  })
})
