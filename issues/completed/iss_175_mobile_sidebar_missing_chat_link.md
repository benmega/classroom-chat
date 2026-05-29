# Mobile Sidebar Navigation Missing Link to Chat

## Description
When accessing pages other than the main Chat page (such as `/profile`, `/achievements`, etc.) on a mobile viewport, the mobile navigation sidebar menu does not contain a link to return to the Chat/Announcements page (`/`). Since the main page header is styled differently or lacks standard links on mobile, users have no easy way to navigate back to the main chat interface once they leave it.

## Steps to Reproduce
1. Log in to the application.
2. Set the browser viewport width to mobile dimensions (e.g., 390px).
3. Navigate to a subpage like `/profile`.
4. Click the hamburger menu to open the mobile sidebar.
5. Review the list of available navigation links.

## Expected Result
A link to "Chat" or "Announcements" (routing to `/`) should be present in the mobile navigation menu, similar to the other main sections of the app.

## Actual Result
The mobile sidebar navigation menu contains links for Profile, Admin Panel, Achievements, Certificate, Challenge, Bit Shift, Record, and History, but does not list Chat/Announcements.

## Impact
Medium - Blocks easy mobile navigation back to the primary chat interface from other pages.

## Screenshots
![Mobile Sidebar Menu Missing Chat Link](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_sidebar_open.png)

## Root Cause
The link to the main Chat/Announcements page was omitted from the mobile sidebar navigation menu definition in `Layout.jsx`. It was present in the main header logo, but on mobile, having an explicit navigation item is more intuitive.

## Changed Files
- `frontend/src/components/Layout/Layout.jsx`
