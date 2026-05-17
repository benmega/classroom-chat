# Issue: User Management Table Layout & Missing Pagination

## Status
- **ID**: iss_002
- **Severity**: Medium
- **Type**: UI/UX Layout
- **Reporter**: Antigravity

## Description
The User Management table in the Admin Panel has layout issues that affect readability and scalability:
1. **Unbalanced Row Height**: The "Account Type" column uses vertical badges (e.g., "STUDENT", "ADMINISTRATOR") that are disproportionately large, causing each row to take up excessive vertical space. This results in fewer users being visible on the screen at once.
2. **Missing Pagination**: The application currently lists all users (84 found during testing) in a single list without pagination controls. This will lead to performance degradation as the user base grows.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Admin Panel.
3. Select "User Management" from the sidebar.
4. Observe the table row heights and the lack of pagination at the bottom of the list.

## Visual Evidence
![User Table Layout](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/admin_dashboard_view_1778391630813.png)

## Expected Behavior
- Row heights should be minimized to allow for more information density. Badges should be horizontally oriented or smaller.
- Standard pagination (e.g., 20-50 users per page) or a robust infinite scroll mechanism should be implemented.

## Environment
- **Browser**: Chrome (via Playwright)
- **Resolution**: 1280x800 (Desktop)

## Root Cause
The Account Type column was using a generic `className="badge"` class. In standard un-scoped React builds, importing CSS globally causes any class declarations to be shared across the entire page. A global sprite stylesheet (`sprite.css`) declared `.badge` as a base class for large 128x128px achievement image sprite containers. Consequently, text label chips rendering with `className="badge"` inherited the dimensions and layout intended for image sprites, resulting in disproportionately tall rows and sparse layouts. 

Pagination controls were already present and functional in the component (`Users.jsx`) but were visually displaced by the oversized row heights.

## Changed Files
- `frontend/src/pages/Admin/Users.jsx`
- `frontend/src/pages/Admin/Users.css`
- `frontend/src/components/Layout/Layout.jsx` (Fixed broken DuckIcon import path)
- `frontend/src/components/admin/AdminModals.jsx` (Fixed broken DuckIcon import path)
- `frontend/src/components/admin/AdminStats.jsx` (Fixed broken DuckIcon import path)
