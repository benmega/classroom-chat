# Critical: Admin Login Fails with 401/500 Error

## Description
Attempting to log in as the admin user (`ben`) results in authentication failures (401 Unauthorized or 500 Internal Server Error). This prevents administrative access to the platform.

## Steps to Reproduce
1. Navigate to `http://localhost:5173/login`.
2. Enter username `ben`.
3. Enter password `rK@76E6P7z7E`.
4. Click the 'Login' button.

## Expected Result
Admin should be successfully authenticated and redirected to the admin dashboard.

## Actual Result
The authentication fails, sometimes returning a 401 (invalid credentials) or a 500 (internal server error). The user cannot access protected admin routes.

## Impact
Critical - Platform administrators cannot manage users or settings.

## Screenshots
![Admin Authentication Failure](file:///C:/Users/Ben/.gemini/antigravity/brain/88abffad-61f3-424a-97ed-87817374f106/login_page_1776092482203.png)
