# Parent Users Redirected from /chat and /profile

## Description
Parent users who attempt to manually navigate to `/chat` or `/profile` via the URL bar are immediately redirected back to `/parent/dashboard`.

## Steps to Reproduce
1. Log into the application using a Parent account.
2. Manually enter the URL `http://localhost:5173/chat` or `http://localhost:5173/profile` in the browser.
3. Observe the redirect.

## Expected Result
Parent users should be able to access the chat and profile pages to communicate with teachers or update their profile.

## Actual Result
The application redirects the parent back to the dashboard, blocking access entirely.

## Impact
High. It prevents parents from communicating (chatting) and managing their profiles, which are explicitly stated as parent-specific workflows.

## Screenshots
N/A (Redirects silently)

## Root Cause
The `ProtectedRoute` wrapper in `App.jsx` was strictly redirecting any user with the `parent` role to `/parent/dashboard` if the requested path didn't start with `/parent/`. This inadvertently blocked access to `/chat` and `/profile`.

## Resolution
Updated the `ProtectedRoute` condition in `App.jsx` to explicitly allow parent users to access paths starting with `/chat` and `/profile`. Also updated `App.test.jsx` to assert that parents can properly access `/chat`.

## Changed Files
- `frontend/src/App.jsx`
- `frontend/src/App.test.jsx`
