# Classroom Chat Styling Guidelines

These guidelines ensure visual consistency and a premium aesthetic throughout the Classroom Chat application. All new features and visual updates must adhere to these principles.

## Core Aesthetic
The application relies on a **Flat Design** aesthetic with crisp lines and subtle depth.

### Background and Layers
- **Global Background:** The `body` element manages the primary background via a solid `var(--bg-secondary)`. 
- **Panels and Containers:** Primary content areas should use a solid `var(--bg-primary)`. Avoid transparent backgrounds.

### Legacy Classes
- **`.glass-panel`**: This is a legacy class name. It no longer applies a backdrop blur. Instead, it applies a solid white background (`var(--bg-primary)`), a subtle border (`var(--border-subtle)`), and smooth transitions matching the flat aesthetic.
- Example usage: 
  ```jsx
  <div className="glass-panel">
      <h2>Section Title</h2>
      <p>Content goes here.</p>
  </div>
  ```

### Utilities over Custom CSS
- **Buttons:** Always use the global utility button classes (`.btn-premium`, `.btn-secondary`, along with size modifiers like `.btn-premium-sm` or `.btn-premium-lg`) instead of writing custom CSS for buttons.
- **Cards:** For solid white cards, use `.card-premium` or `.glass-panel`.
- **Typography & Variables:** Always use CSS variables (e.g., `var(--font-heading)`, `var(--text-muted)`) for colors, fonts, spacing, and borders. Refer to `src/assets/css/variables.css` for the complete list.

## Responsiveness
- Ensure all layouts adapt fluidly. Avoid fixed pixel dimensions for containers unless necessary.
- Use CSS Grid and Flexbox for structural layout logic.
