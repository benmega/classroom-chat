# Application Aesthetic Guidelines

The look and feel of the app. Follow it when generating, refactoring or polishing UI; the `polish-ui` agent skill grades against this file.

## Overarching Style: Modern Flat

Flat with strategic glassmorphism: solid, flat surfaces by default, with a little glass for depth where something floats.

### Core Principles
1. **Flat Dominance**: Favor solid colors and 1px `var(--border-subtle)` borders over 3D effects and heavy gradients. Avoid large, diffuse shadows; keep them small, e.g. `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` or the `--shadow-sm` / `--shadow-soft` tokens.
2. **Strategic Glassmorphism**: Use `backdrop-filter: blur(...)` and semi-transparent backgrounds (e.g. `rgba(255,255,255,0.7)`) *only* for floating layers such as sticky headers, modals and overlapping panels. Panels themselves stay solid.
3. **High Density (For Admin Tools)**: For admin or power-user views, prioritize dense layouts (inline forms, compact toggles) to minimize scrolling and clicks. Consumer-facing views can have more padding.
4. **Subtle Micro-interactions**: Use very soft hover states (a slight background shift or a 1px `translateY`) rather than dramatic transformations.

### Typography & Structure
*   Use terse, actionable labels, in the app's playful voice (see [PERSONALITY_GUIDE.md](../PERSONALITY_GUIDE.md)).
*   Keep the text hierarchy clear: muted colors for secondary text, bold weights for primary data.

## Building Blocks

- **Layers**: `body` is `var(--bg-secondary)`; panels and containers are a solid `var(--bg-primary)`.
- **Buttons**: use `.btn-premium` (gradient-filled) or `.btn-secondary`, with the `-sm` / `-lg` size modifiers (`.btn-premium-sm`, `.btn-secondary-lg`). Do not write custom button CSS.
- **Cards**: use `.card-premium` or `.glass-panel`. `.glass-panel` is a name kept for compatibility: it is solid (`var(--bg-primary)` with a 1px `var(--border-subtle)` border) and has no blur, so do not add blur back to it.
- **Variables**: take colors, fonts, spacing and borders from `var(--...)` tokens (`frontend/src/assets/css/variables.css`), not literal values.
- **Responsive**: lay out with CSS Grid and Flexbox; avoid fixed pixel containers.
