// WCAG 2.x colour maths shared by the stylesheet contrast tests (assets/css/contrast.test.js, adminStyles.test.js).
// Plain hex in, ratio out: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Relative luminance of a #RRGGBB colour. */
export const luminance = (hex) => {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio of two #RRGGBB colours, 1 to 21, in either order. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The #RRGGBB colour a translucent `rgba(r, g, b, a)` shows as over an opaque #RRGGBB background. */
export const flatten = (rgba, background) => {
  const match = rgba.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/)
  if (!match) throw new Error(`not an rgba() colour: ${rgba}`)
  const [r, g, b] = match.slice(1, 4).map(Number)
  const alpha = Number(match[4])
  const below = channels(background)
  const mixed = [r, g, b].map((value, i) => Math.round(value * alpha + below[i] * (1 - alpha)))
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}
