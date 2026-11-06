// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Reduced-motion guards (issue #111): one global switch in index.css, the confetti library's own switch, and the
// pause button on the landing slideshow. Read from disk: vitest swaps imported CSS for an empty string.
const srcDir = fileURLToPath(new URL('../../', import.meta.url))
const read = (rel) => readFileSync(join(srcDir, rel), 'utf8')
const sources = readdirSync(srcDir, { recursive: true })
  .map((f) => f.split(sep).join('/'))
  .filter((f) => /\.(jsx?|css)$/.test(f))

/** The text of the first `@media (prefers-reduced-motion: reduce) { ... }` block, braces matched. */
const reducedMotionBlock = (css) => {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce)')
  if (start < 0) return ''
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1)
  }
  return ''
}

describe('global reduced-motion switch', () => {
  const block = reducedMotionBlock(read('index.css'))

  it('exists in index.css and covers every element and pseudo-element', () => {
    expect(block).not.toBe('')
    expect(block).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{/)
  })

  it('cuts animations and transitions to near zero and plays an endless animation once', () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/)
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    expect(block).toMatch(/scroll-behavior:\s*auto\s*!important/)
  })

  it('also stops the one animation whose own !important shorthand would win', () => {
    expect(read('index.css')).toMatch(/\.perk-animated-border\s*\{[^}]*animation:[^;}]*infinite\s*!important/)
    expect(block).toMatch(/\.perk-animated-border\s*\{\s*animation:\s*none\s*!important/)
  })

  it('is the last thing in index.css, so no later rule in that file competes with it', () => {
    const css = read('index.css')
    const end = css.indexOf('@media (prefers-reduced-motion: reduce)') + block.length
    expect(css.slice(end).trim()).toBe('')
  })
})

describe('confetti', () => {
  it('is never thrown at a visitor who asked for reduced motion', () => {
    const calls = []
    for (const rel of sources.filter((f) => /\.jsx?$/.test(f) && !/\.test\./.test(f))) {
      for (const match of read(rel).matchAll(/\bconfetti\(\{([\s\S]*?)\}\);/g)) {
        calls.push({ rel, body: match[1] })
      }
    }
    expect(calls.map((c) => c.rel).sort()).toEqual([
      'components/chat/SandboxArcadeModal.jsx',
      'components/common/SubmitProgressModal.jsx',
      'components/common/SubmitProgressModal.jsx',
      'pages/General/BitShift.jsx',
    ])
    for (const { rel, body } of calls) expect(body, rel).toMatch(/disableForReducedMotion:\s*true/)
  })
})

describe('motion classes', () => {
  it('defines every animate-* class the markup uses', () => {
    const css = read('index.css')
    const used = new Set()
    for (const rel of sources.filter((f) => /\.jsx$/.test(f) && !/\.test\./.test(f))) {
      for (const [, name] of read(rel).matchAll(/\b(animate-[a-z-]+)\b/g)) used.add(name)
    }
    const undefinedClasses = [...used].filter((name) => !new RegExp(String.raw`\.${name}\s*\{`).test(css))
    expect(undefinedClasses).toEqual([])
  })

  it('gives the landing slideshow a pause button that reduced motion hides, since the animation is already held', () => {
    const css = read('pages/General/Landing.css')
    expect(css).toMatch(/\.slideshow-track\.is-paused\s*\{\s*animation-play-state:\s*paused/)
    expect(reducedMotionBlock(css)).toMatch(/\.slideshow-toggle\s*\{\s*display:\s*none/)
  })
})
