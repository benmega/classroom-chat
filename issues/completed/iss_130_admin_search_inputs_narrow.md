# Issue: Admin Search Inputs Insufficiently Wide

## Status
- **Priority**: Low
- **Severity**: Minor
- **Type**: UI/UX
- **Status**: Open
- **Assigned To**: Antigravity

## Description
The search input fields in the Admin Dashboard and User Directory are relatively narrow (250px and 320px respectively), which feels cramped on higher-resolution desktop screens. This limits the visibility of longer search queries and doesn't match the expansive, premium feel of the rest of the dashboard.

## Reproduction Steps
1. Log in as an administrator.
2. Observe the search box in the Header of the User Directory (`/admin/users`).
3. Observe the search box in the User Management card on the Dashboard (`/admin`).

## Expected Behavior
Search inputs should have a more flexible or slightly wider base width (e.g., 400px - 500px) to better utilize available screen real estate on desktop.

## Actual Behavior
Search boxes are restricted to fixed narrow widths (250px/320px).

## Technical Details
- **Files**: 
  - `frontend/src/pages/Admin/AdminDashboard.css` (`.search-box` width: 250px)
  - `frontend/src/pages/Admin/Users.css` (`.search-bar` width: 320px)
