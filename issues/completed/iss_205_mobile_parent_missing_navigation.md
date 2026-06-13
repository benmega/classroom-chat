# Mobile Parent Missing Navigation Menu

## Description
The Parent Dashboard lacks the global navigation layout (such as the hamburger menu, sidebar, or bottom tab bar) that is present for other user roles. The `ParentDashboard` component does not use the standard `<Layout>` wrapper, leaving the user without access to global app features (e.g., Profile settings) and presenting an isolated UI on mobile viewports.

## Steps to Reproduce
1. Log in to the application as a parent user (e.g., using `test_parent` / `parent123`).
2. Wait for the automatic redirect to `/parent/dashboard`.
3. Resize the window to a mobile viewport (e.g., 390px width) or view it on a mobile device.
4. Attempt to find the hamburger menu or navigation bar to access other areas of the application.

## Expected Result
A consistent global navigation menu (such as a hamburger menu) should be visible on the mobile viewport, allowing the parent to access their profile or other relevant global sections.

## Actual Result
No global navigation menu is present. The top of the page only displays the dashboard header with inline "Add Child" and "Sign Out" buttons. The user is isolated on the dashboard.

## Impact
Major - The absence of a standard layout breaks UI consistency across different roles and restricts the parent from accessing typical global features like a user profile or account settings.

## Screenshots
![Parent Dashboard Missing Navigation](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/05_profile.png)

## Root Cause
The parent-specific routes (`/parent/dashboard`, `/parent/report/:studentId`, etc.) in `App.jsx` were directly rendering their respective components without wrapping them in the standard `<Layout>` component used by other routes. This resulted in the absence of the global navigation structure (like the hamburger menu on mobile) for users logged in as parents. Furthermore, `Layout.jsx` didn't account for parents, potentially showing student-specific links if they were to use it.

## Changed Files
- `frontend/src/App.jsx`
- `frontend/src/components/Layout/Layout.jsx`
