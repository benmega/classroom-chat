# Inline Style Tag Injection in ProtectedRoute

## Description
In `frontend/src/App.jsx`, the `ProtectedRoute` component injects a raw `<style>` tag containing a CSS `@keyframes` animation definition:
```jsx
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
```
Injecting `<style>` tags directly inside a React component's render cycle is a bad practice. Every time this component mounts, it will append a new `<style>` tag to the DOM. This can lead to duplicate style definitions polluting the document head/body over time, and it makes styling harder to maintain.

## Location
- `frontend/src/App.jsx` (Lines 62-64)

## Proposed Fix
Move the `@keyframes spin` definition to a global CSS file, such as `index.css`, and simply apply the class or inline style referencing the animation in the JSX.
