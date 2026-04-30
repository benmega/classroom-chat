# ISS-014: Chat App Loading Spinner Has Inverted Color Scheme

**Type:** UI  
**Severity:** Low  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

The loading spinner shown in `ProtectedRoute` while auth state is initializing (`App.jsx` lines 44–65) uses `background: 'var(--text-primary)'` and `color: 'var(--bg-secondary)'`. This inverts the intended color scheme — the text colour is used as the background and vice versa. In a dark-mode application, this results in a blinding **white flash** on first load before the app renders.

---

## Affected File

`frontend/src/App.jsx`, lines 44–55:
```jsx
<div style={{ 
  ...
  background: 'var(--text-primary)',    // ← Should be var(--bg-primary)
  color: 'var(--bg-secondary)',         // ← Should be var(--text-primary)
  ...
}}>
```

---

## Impact

- On every page load, users see a brief but jarring white flash (or an incorrectly coloured screen) before the app renders.
- The heading text on the loading screen may be invisible (white text on white background) or barely readable.

---

## Recommended Fix

```jsx
<div style={{
  ...
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  ...
}}>
```
