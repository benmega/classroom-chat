# Missing Admin Sidebar Sections

## Description
Key administrative sections including "Users", "Analytics", and "Settings" are missing from the Admin sidebar navigation menu. Furthermore, attempting to access these routes directly (e.g., `/admin/settings`) fails, usually resulting in a redirect to home or an empty page.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Admin Panel.
3. Open the sidebar navigation menu.
4. Observe the lack of links for Users, Analytics, and Settings.
5. Manually enter `http://localhost:5173/admin/settings`.
6. Observe the redirect or broken state.

## Expected Result
The sidebar should contain logically expected administration links. If these features are incomplete, they should at least show "Coming Soon" or failing gracefully instead of silent redirects.

## Actual Result
The UI is missing major expected features and navigation to intended routes breaks.

## Impact
Medium - These features appear to be incomplete or disconnected from the routing logic.

## Screenshots
![Sidebar Mobile Open](file:///C:/Users/Ben/.gemini/antigravity/brain/843c6c4a-888e-4344-bd49-a68208c21638/admin_panel_audit_1775578777190.webp)
