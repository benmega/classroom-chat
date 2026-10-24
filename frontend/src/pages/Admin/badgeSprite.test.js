// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSpriteSlugs, hasBadgeSprite } from './badgeSprite'

// vitest swaps imported CSS (even ?raw) for an empty string, so the sprite's rules are stood in for here.
vi.mock('../../assets/css/sprite.css?raw', () => ({
  default: '.badge { width: 128px; }\n.badge-10-messages { background-position: -0px -0px; }\n.badge-old_timer { background-position: -128px -0px; }',
}))

describe('badge sprite slugs', () => {
  it('lists the slugs that have a cell in the sprite', () => {
    expect(hasBadgeSprite('10-messages')).toBe(true)
    expect(hasBadgeSprite('old_timer')).toBe(true)
  })

  it('does not list a slug without a rule, nor the bare .badge rule', () => {
    expect(hasBadgeSprite('new-badge')).toBe(false)
    expect(hasBadgeSprite('')).toBe(false)
    expect(hasBadgeSprite(undefined)).toBe(false)
  })

  it('reads every cell rule of the generated sprite sheet', () => {
    const css = readFileSync(fileURLToPath(new URL('../../assets/css/sprite.css', import.meta.url)), 'utf8')
    const cells = css.split('\n').filter((line) => /^\.badge-/.test(line))
    const slugs = parseSpriteSlugs(css)

    expect(cells.length).toBeGreaterThan(0)
    expect(slugs.size).toBe(cells.length)
    expect(slugs.has('10-messages')).toBe(true)
    expect(slugs.has('wrapper')).toBe(false)
  })
})
