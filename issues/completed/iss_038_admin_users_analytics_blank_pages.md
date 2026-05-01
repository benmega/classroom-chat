# Admin Users and Analytics (Blank Pages)

## Description
The /admin/users and /admin/analytics sections are completely blank. Only the global header and footer are visible, but no user list, "Delete user" buttons, or analytics charts render.

## Steps to Reproduce
1. Log in as an admin (`ben`).
2. Navigate to `/admin/users` or `/admin/analytics`.
3. Observe these pages are entirely blank.

## Expected Result
`/admin/users` should list all users with actions. `/admin/analytics` should show usage trends and charts.

## Actual Result
No content is rendered. The console logs "Internal Server Error" for several JS source files (e.g. `Users.jsx`).

## Impact
Critical - These core administrative panels are missing or failing to load entirely.

## Screenshots
[Link to empty admin pages/console errors]
