# Application Aesthetic Guidelines

This document serves as the single source of truth for the visual style and aesthetic of the application. It is strictly enforced during any UI generation, refactoring, or polishing tasks.

## Overarching Style: Modern Flat
The application is currently transitioning to a **Flat Design** aesthetic, while strategically retaining minimal **Glassmorphic** elements for depth and premium feel. 

### Core Principles
1. **Flat Dominance**: Backgrounds, panels, and primary elements should favor solid, flat colors with clean borders over 3D effects or heavy gradients.
2. **Strategic Glassmorphism**: Use `backdrop-filter: blur(...)` and semi-transparent backgrounds (e.g., `rgba(255,255,255,0.7)`) *only* for floating elements like sticky headers, modals, or overlapping panels to create depth without relying on heavy drop shadows.
3. **High Density (For Admin Tools)**: For admin or power-user views, prioritize dense layouts (e.g., inline forms, compact toggles) to minimize scrolling and clicks. Consumer-facing views can have more padding.
4. **Subtle Micro-interactions**: Use very soft hover states (e.g., a slight background color shift or a 1px `translateY`) rather than dramatic transformations.

### Shadows & Borders
*   **Shadows**: Avoid large, diffuse shadows. If shadows are used, they should be extremely crisp and subtle (e.g., `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`).
*   **Borders**: Prefer 1px solid borders in a subtle gray/white to separate components instead of relying on shadows.

### Typography & Structure
*   Use terse, actionable labels.
*   Ensure text hierarchy is clear (e.g., muted colors for secondary text, bold weights for primary data).
