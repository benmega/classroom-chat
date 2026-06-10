# Admin Dashboard Dropdown Clipping

## Description
In the Admin Overview Dashboard, the "Last 7 Days" dropdown located in the "Duck Transactions" graph area is cut off on the right side of the screen on mobile viewports. The dropdown arrow is partially out of bounds.

## Steps to Reproduce
1. Authenticate as an admin.
2. Set the viewport to a mobile width (e.g., 390px).
3. Navigate to the Admin Dashboard (`/admin`).
4. Scroll down to the "Duck Transactions" chart.
5. Observe the date range filter dropdown ("Last 7 Days") on the right side above the chart.

## Expected Result
The dropdown should be fully visible within the screen bounds with appropriate right padding or margin.

## Actual Result
The dropdown extends past the right edge of the screen, clipping the dropdown arrow icon.

## Impact
Low - Functionality is likely unaffected, but it breaks the mobile layout and aesthetics.

## Screenshots
![Admin Dropdown Clipping](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_audit/05_admin.png)

## Root Cause & Resolution
- **Root Cause**: The flex container for the "Duck Transactions" header lacked `flex-wrap`, causing its contents (the `h3` and the `select` element) to overflow on narrow mobile viewports rather than wrapping to a new line.
- **Resolution**: Added `flexWrap: 'wrap'` and `gap: '0.5rem'` to the inline styling of the `.card-header` `div` for the "Duck Transactions" graph in `frontend/src/pages/Admin/AdminDashboard.jsx`.
- **Changed Files**: `frontend/src/pages/Admin/AdminDashboard.jsx`
