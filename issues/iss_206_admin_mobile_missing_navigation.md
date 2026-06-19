# Admin Mobile App Layout Missing Navigation

## Description
When logged in as an Admin and navigating the main application routes (`/`, `/profile`, `/projects`), the mobile viewport entirely lacks a header, hamburger menu, or bottom navigation bar.

## Steps to Reproduce
1. Log in as an Admin via `/dev-login?role=admin`.
2. Navigate to the main dashboard (`/`).
3. View the application on a mobile viewport (e.g., 390px width).

## Expected Result
The mobile layout should include a responsive header with a hamburger menu or a bottom navigation bar, allowing the user to navigate the application seamlessly.

## Actual Result
There is no header or navigation UI. The page content starts at the very top edge of the screen, and the user is effectively trapped on the current page with no global navigation options.

## Impact
Critical - Admin users cannot navigate the main application on mobile devices.

## Screenshots
![Admin Dashboard Missing Nav](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_admin_dashboard.png)
![Admin Profile Missing Nav](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_admin_profile.png)
