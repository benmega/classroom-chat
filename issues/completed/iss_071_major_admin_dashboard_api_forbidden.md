# Major: Admin Dashboard and User Directory Fail to Load (403 Forbidden)

## Description
Even when the frontend UI believes a session is active (e.g., showing user 'Mr. Mega'), navigating to admin-protected routes like `/admin/dashboard` or `/admin/users` results in 403 Forbidden errors for backend API calls. This results in empty screens or error messages on the dashboard.

## Steps to Reproduce
1. (While supposedly logged in as admin) Navigate to `http://localhost:5173/admin/dashboard`.
2. Observe "Error loading dashboard stats" or empty charts.
3. Navigate to `http://localhost:5173/admin/users`.
4. Observe an empty table with no student data.

## Expected Result
Admin pages should fetch and display data from the backend.

## Actual Result
Backend returns 403 Forbidden for data fetching endpoints (e.g., `/admin/stats`, `/admin/users`), causing the UI to fail.

## Impact
Major - Admin features are non-functional even if login appears to succeed.

## Screenshots
![Admin Dashboard Error](file:///C:/Users/Ben/.gemini/antigravity/brain/88abffad-61f3-424a-97ed-87817374f106/admin_dashboard_error_1776092400407.png)
![Empty User Directory](file:///C:/Users/Ben/.gemini/antigravity/brain/88abffad-61f3-424a-97ed-87817374f106/admin_users_empty_1776092469274.png)
