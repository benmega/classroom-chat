# Admin Dashboard Stats Overflow

## Description
The stat cards on the Overview Dashboard do not scale or wrap correctly when the viewport width decreases, leading to horizontal overflow and clipping of the rightmost cards. This occurs even on standard desktop resolutions like 1440px and is severe at 1024px.

## Steps to Reproduce
1. Log in as an admin (e.g., via `/dev-login?role=admin`).
2. Navigate to the Admin Dashboard (`/admin`).
3. Set the browser viewport width to 1440px or 1024px.
4. Observe the "Overview Dashboard" stat cards.

## Expected Result
The cards should either wrap to a new line or scale their width to fit within the main content area without overflowing the screen.

## Actual Result
The cards maintain a fixed or insufficiently flexible width, causing them to push beyond the right edge of the content area. The "SYSTEM..." card is partially or fully cut off.

## Impact
Major - This breaks the primary "at-a-glance" dashboard view and makes important system metrics invisible to the administrator.

## Screenshots
![Admin Dashboard 1440px Overflow](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/dashboard_1440.png)
![Admin Dashboard 1024px Overflow](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/dashboard_1024.png)

## Root Cause
1. **Container Overflow**: The `.admin-main-wrapper` used `flex: 1` with a `margin-left` for the fixed sidebar, but lacked a `max-width` constraint or `min-width: 0`, causing it to expand beyond the viewport when children were wide.
2. **Flex Item Minimum Size**: The stat cards used `display: flex` but their internal `stat-info` container lacked `min-width: 0`. This prevented the flex items from shrinking smaller than their text content (the long stat labels), which in turn forced the grid columns to expand and overflow the container.
3. **Grid Rigidity**: The use of `auto-fit` with a relatively large `minmax` value made the grid less predictable at specific desktop breakpoints.

## Resolution
1. **Layout Constraint**: Added `min-width: 0` and `max-width: calc(100% - var(--sidebar-width))` to `.admin-main-wrapper` in `AdminLayout.css` to ensure the main content area never exceeds the available viewport space.
2. **Flexbox Fix**: Added `min-width: 0` to `.stat-info` in `AdminDashboard.css` to allow labels to shrink and wrap.
3. **Text Wrapping**: Enabled `overflow-wrap: break-word` and `white-space: normal` on `.stat-label`.
4. **Responsive Grid**: Switched to explicit column-based media queries for the `stats-grid` to provide a more stable and premium layout at 1440px (4 columns) and 1024px (3/2 columns).
5. **Visual Polish**: Reduced padding and font sizes for stats on smaller screens to maintain a compact, premium feel.

## Changed Files
- `frontend/src/components/Layout/AdminLayout.css`
- `frontend/src/pages/Admin/AdminDashboard.css`

