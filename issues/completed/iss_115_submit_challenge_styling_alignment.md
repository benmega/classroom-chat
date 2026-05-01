# iss_115_submit_challenge_styling_alignment
**Status**: Completed
**Resolution Date**: 2026-04-19

## Root Cause
The "Submit Challenge" page was using a legacy theme that lacked the modern glassmorphism design system. Additionally, the challenge substrate had a visual glitch on the right edge (a misaligned dark vertical line) caused by inconsistent overflow and absolute positioning rules.

## Resolution
- **Frontend Refactor**: Updated `SubmitChallenge.css` to implement a premium glassmorphism theme, intensified the blue outer glow effect, and added a sleek top accent line.
- **Visual Glitch Fix**: Resolved the "vertical line" glitch on the card edge by standardizing the `form-card` border-radius and fixing the `::before` accent line alignment.
- **Aesthetic Alignment**: Aligned the Submit Challenge page with the "Submit Certificate" and "Bit Shift" pages by using the shared `gradient-primary` and `shadow-glow` design tokens.

## Changed Files
- `frontend/src/pages/General/SubmitChallenge.css`


