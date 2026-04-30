# Admin Sidebar Badge Misalignment

## Description
The "NEW" status badge in the admin sidebar navigation is not properly aligned with its associated menu item ("User Approvals"). It appears floating to the right and vertically offset, breaking the visual harmony of the sidebar.

## Steps to Reproduce
1. Log in as an admin.
2. View the sidebar navigation on any admin page.
3. Observe the "User Approvals" menu item.

## Expected Result
The "NEW" badge should be neatly positioned next to the label, following consistent spacing and vertical alignment.

## Actual Result
The badge is disconnected from the text and misaligned, appearing as an afterthought rather than an integrated UI element.

## Impact
Low - Visual polish issue that detracts from the "premium" feel of the application.

## Screenshots
![Sidebar Badge Misalignment](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/dashboard_1440.png)

## Root Cause
The `.nav-badge` class used `margin-left: auto` within a flex container, which pushed the badge to the far right of the sidebar item. Additionally, it lacked explicit vertical centering and height constraints, leading to visual misalignment with the text label.

## Resolution
- Removed `margin-left: auto` from `.nav-badge`.
- Added `margin-left: 10px` to keep the badge integrated with the menu label.
- Implemented `display: inline-flex`, `align-items: center`, and a fixed `height: 18px` to ensure perfect vertical centering.
- Adjusted font size and border radius for a more refined, premium appearance.

## Changed Files
- `frontend/src/components/Layout/AdminLayout.css`

## Evidence
- Fixed screenshot: ![Sidebar Badge Fix](file:///C:/Users/Ben/.gemini/antigravity/brain/4dccad66-723f-4260-9264-656fad646225/admin_sidebar_badge_fix_1777037798044.png)

