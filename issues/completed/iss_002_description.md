# Missing Navigation to Chat and Profile for Parent Users

## Description
When logged in as a parent user on a desktop viewport (1440px), there are no navigation links in the header or sidebar to access the Chat or Profile features. The header navigation block is entirely empty.

## Steps to Reproduce
1. Log into the application using a Parent account (e.g., test_parent).
2. Observe the top header navigation and left sidebar.
3. Note the absence of links for Chat and Profile.

## Expected Result
Parent users should be able to navigate to Chat and Profile via the UI header or sidebar.

## Actual Result
No links exist for these core features. The top header banner navigation is empty.

## Impact
High. Parents are entirely unable to find the Chat and Profile features organically.

## Screenshots
![Missing Navigation](c:/Users/Ben/AntiGravity/classroom-chat/issues/dashboard_screenshot.png)

## Root Cause
Parent users were intentionally excluded from viewing the Profile link in the top dropdown menu within `Layout.jsx`, and their specific desktop navigation rail component (`ParentNavRail.jsx`) omitted the `MessageSquare` (Chat) and `User` (Profile) links.

## Changed Files
- `frontend/src/components/Layout/Layout.jsx` (Removed parent restriction on Profile dropdown link)
- `frontend/src/components/Layout/ParentNavRail.jsx` (Added Chat and Profile links, along with `MessageSquare` icon and `unreadCount` badge functionality)
