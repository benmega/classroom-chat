# Admin Layout Header Title Overlaps Hamburger Menu on Mobile

## Description
Across multiple Admin pages (Dashboard, Project Submissions, Certificate Approvals, User Directory, System Analytics, Create Achievement), the page header title overlaps directly with the hamburger menu button when viewed on a mobile viewport (390px). There appears to be insufficient left padding or margin on the title element to accommodate the absolutely positioned menu button.

## Steps to Reproduce
1. Log in to an Admin account.
2. Emulate a mobile viewport (e.g., 390x844px).
3. Navigate to any standard Admin page like Dashboard (`/admin`), Projects (`/admin/projects`), Certificates (`/admin/certificates`), or Users (`/admin/users`).
4. Observe the page header title at the top of the screen.

## Expected Result
The page title should have sufficient left padding to ensure it does not overlap with the hamburger menu button.

## Actual Result
The page title text visually overlaps with the hamburger menu button, causing readability issues and a broken UI appearance.

## Impact
Medium - It affects the visual aesthetics of the mobile app on almost all admin pages, making the UI look broken, though it does not prevent navigation.

## Screenshots
![Admin Dashboard Overlap](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_200_admin_dashboard.png)
![Admin Projects Overlap](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_202_admin_projects.png)
