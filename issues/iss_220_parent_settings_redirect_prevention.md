# Parent Role Settings Route Forced Redirect to Dashboard

## Description
In `App.jsx`, `ProtectedRoute` enforces strict path checks for users with the `parent` role. Lines 106–108 redirect any parent request that does not begin with `/parent/`, `/chat`, or `/profile` back to `/parent/dashboard`. Consequently, navigating to `/settings` or clicking account settings links causes an immediate forced redirect back to `/parent/dashboard`, preventing parents from updating their profile, contact details, or credentials.

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Enter `http://localhost:5173/settings` in the address bar (or click account settings).
3. Observe the browser URL bar and rendering state.

## Expected Result
Parent users should be allowed to access `/settings` or `/parent/settings` to manage account preferences, email notifications, and password settings.

## Actual Result
The router immediately redirects the parent user back to `http://localhost:5173/parent/dashboard`.

## Impact
Major - Blocks parents from accessing settings or editing account preferences.

## Screenshots
![Parent Settings Forced Redirect](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_221_parent_settings_redirect_desktop.png)
