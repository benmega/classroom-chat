# ISSUE-005: Monolithic Frontend Router and Component Logic in `App.jsx`

## Description
The `App.jsx` file is acting as a "God Component," containing too much routing logic, verbose configuration, and inline component definitions. This makes the main entry point difficult to read and maintain.

## Identified Smells:
1.  **Inline `ProtectedRoute`:** The `ProtectedRoute` component is defined within `App.jsx` instead of its own file.
2.  **Verbose `Toaster` Configuration:** Over 40 lines of `App.jsx` are dedicated to styling the `Toaster` component.
3.  **Repetitive Route Wrapping:** Every route manually wraps its element in `ProtectedRoute` and `Layout`.
4.  **Inline Styles:** The loader in `ProtectedRoute` uses inline styles instead of CSS modules or the global theme.

## Impact
- **Low Readability:** The core application structure is buried under verbose configuration and repetitive code.
- **Limited Reusability:** `ProtectedRoute` cannot be easily used elsewhere or tested in isolation.
- **Maintenance Burden:** Adding a new route requires copy-pasting several wrapper components.

## Proposed Solution
- Extract `ProtectedRoute` to `src/components/Auth/ProtectedRoute.jsx`.
- Extract `Toaster` configuration to a separate component or utility (e.g., `src/components/Common/AppToaster.jsx`).
- Utilize **Layout Routes** (Nested Routes) in `react-router-dom` to automatically wrap groups of routes in `ProtectedRoute` and `Layout`.
- Move inline styles to `index.css` or use a themed component approach.

## Related Files
- `frontend/src/App.jsx`
