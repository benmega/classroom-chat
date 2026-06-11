# Hard Page Reload on 401 Unauthorized

## Description
In `frontend/src/api/client.js`, the axios response interceptor handles `401 Unauthorized` errors by forcibly redirecting the user using `window.location.href = '/login';`. 
Because this is a Single Page Application (SPA), using `window.location.href` forces a complete browser page reload. This causes the app to lose all local React state, unmount the entire component tree, and reload all JavaScript assets, leading to a jarring user experience.

## Location
- `frontend/src/api/client.js` (Line 36)

## Proposed Fix
Instead of using `window.location.href`, integrate with React Router or the global auth store (e.g., `useAuthStore`) to handle the logout and redirection seamlessly without a full page reload. For example, triggering a logout action in Zustand, which updates `isAuthenticated` to false, allowing `ProtectedRoute` or `App.jsx` to natively redirect the user.

## Resolution
- Modified `frontend/src/api/client.js` to dynamically import `useAuthStore` and call `setState({ user: null, isAuthenticated: false })` instead of doing a hard redirect with `window.location.href`.
- Also updated `frontend/src/store/useAuthStore.js`'s `logout` method to remove `window.location.href = '/'` so that logout triggers a soft redirect via `ProtectedRoute` back to the login page.
