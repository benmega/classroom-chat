# Admin Users Data Leak

## Description
Directly navigating to `http://localhost:5173/admin/users` returns raw JSON for the entire user database. This leaks extremely sensitive information, including password hashes, salts, and user IP addresses. This appears to be because the backend route for fetching user data is conflicting with the frontend route intended to render the user interface.

## Steps to Reproduce
1. Log in as an admin (`ben`).
2. Type `http://localhost:5173/admin/users` directly into the address bar.
3. Observe that raw JSON for the user database is rendered, including fields like `password_hash` and `salt`.

## Expected Result
Depending on architecture, navigating to `/admin/users` should either render the frontend React app (which then dynamically fetches data) or return a 404/Not Authorized. Under no circumstances should raw database values, especially password hashes and salts, be exposed to the client. Admin API responses should strip sensitive data.

## Actual Result
The API dumps the entire database model as JSON, including all sensitive fields.

## Impact
Critical - Severe security vulnerability resulting in complete extraction of authentication secrets.

## Screenshots
[Raw JSON output in browser]
