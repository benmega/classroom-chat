# Desktop Layout Missing Navigation Sidebar

## Description
On desktop viewports (e.g., 1440px width), the primary navigation links (such as the Profile link) are hidden or entirely missing from the visible layout. A hamburger menu is present in the top-right corner, indicating a mobile-first design that has not been correctly adapted for desktop resolutions. This degrades the user experience by hiding common user flows.

## Steps to Reproduce
1. Log into the application and navigate to the dashboard on a desktop resolution (1440x900).
2. Attempt to locate the Profile link or other main navigation links without interacting with the hamburger menu.
3. Observe that no sidebar or top navigation bar contains these links.

## Expected Result
A desktop layout should utilize the available screen width to display a persistent sidebar or top navigation bar, allowing 1-click access to common routes like Profile, Dashboard, and Settings.

## Actual Result
The navigation links are hidden, causing automated tests for `a[href="/profile"]` to timeout as the element is not visible on the screen. The layout relies on a mobile hamburger menu.

## Impact
Medium - Degrades the desktop user experience and makes navigation significantly less intuitive on larger screens.

## Screenshots
![Dashboard Desktop View](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/desktop_dashboard_audit.png)
