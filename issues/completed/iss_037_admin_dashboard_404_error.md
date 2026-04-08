# Admin Dashboard (404 Error)

## Description
The main Admin Dashboard fails to load data, and the browser console reveals a 404 NOT FOUND when attempting to access the `GET /admin/dashboard` endpoint in the backend.

## Steps to Reproduce
1. Log in as an admin (`ben`).
2. Navigate to the Admin sections (e.g., `/admin`).
3. Observe the "Failed to load dashboard data" toast and empty dashboard stats.
4. Check the console for a 404 error on `GET /admin/dashboard`.

## Expected Result
The dashboard should present system statistics and overview data.

## Actual Result
The API endpoint is missing or incorrectly mapped in the backend, leading to a 404.

## Impact
Major - Admin can't see the overview of the platform.

## Screenshots
[Link to admin dashboard showing empty stats and 404 error]
