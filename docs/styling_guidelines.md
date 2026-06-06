# Classroom Chat Styling Guidelines

These guidelines ensure visual consistency and a premium aesthetic throughout the Classroom Chat application. All new features and visual updates must adhere to these principles.

## Core Aesthetic
The application relies on a **global mesh gradient background** combined with **glassmorphic panels** and vibrant gradient accents.

### Background and Layers
- **Global Background:** The `body` element manages the primary background via `var(--gradient-mesh)` over `var(--bg-secondary)`. 
- **Avoid Solid Backgrounds:** Do not apply hard-coded solid colors (like `#ffffff` or `var(--bg-primary)`) to top-level page containers. Allow the global gradient mesh to show through. Pages should generally use `background: transparent`.

### Glassmorphism
- Use the `.glass-panel` utility class for primary content containers, cards, and headers where possible. This class applies a consistent background opacity, blur, and soft shadow that interacts beautifully with the mesh gradient.
- Example usage: 
  ```jsx
  <div className="glass-panel">
      <h2>Section Title</h2>
      <p>Content goes here.</p>
  </div>
  ```

### Utilities over Custom CSS
- **Buttons:** Always use the global utility button classes (`.btn-premium`, `.btn-secondary`, along with size modifiers like `.btn-premium-sm` or `.btn-premium-lg`) instead of writing custom CSS for buttons.
- **Cards:** For solid white cards, use `.card-premium`. However, for a cohesive look across the application, `.glass-panel` is generally preferred.
- **Typography & Variables:** Always use CSS variables (e.g., `var(--font-heading)`, `var(--text-muted)`) for colors, fonts, spacing, and borders. Refer to `src/assets/css/variables.css` for the complete list.

## Responsiveness
- Ensure all layouts adapt fluidly. Avoid fixed pixel dimensions for containers unless necessary.
- Use CSS Grid and Flexbox for structural layout logic.
