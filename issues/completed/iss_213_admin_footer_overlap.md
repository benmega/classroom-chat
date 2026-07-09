# Admin Dashboard Footer Overlap

## Description
The fixed footer containing the version text ("Version 2.4.0 (Alpha)") sits on top of and clips the bottom of the "User Management" table on the Admin Dashboard.

## Steps to Reproduce
1. Navigate to `/admin`.
2. Scroll down to the User Management section.

## Expected Result
The main content area should have enough bottom padding/margin to account for the fixed footer, or the footer shouldn't overlap the table content.

## Actual Result
The white footer bar obscures the bottom items of the user list.

## Impact
Medium - Blocks content interaction.

## Screenshots
![Admin Dashboard Footer Overlap](file:///C:/Users/Ben/.gemini/antigravity/brain/d5795b34-a7bc-4bbb-b110-494656adce59/admin-dashboard-bug.png)

## Technical Analysis & Proposed Fix
* **Root Cause**:
  - The main container for admin routes `.admin-body` does not have a bottom padding or margin offset to clear the height of the fixed footer.
  - On mobile, this causes tables and scrollable lists to extend underneath the sticky/fixed footer bar, blocking text and click targets.
* **Proposed CSS & Code Fix**:
  - Add a bottom padding or margin (e.g. `padding-bottom: 80px;`) to `.admin-body` in `AdminLayout.css` to ensure all elements clear the footer height when scrolled to the bottom.

* **Resolution**: Added `padding-bottom: 80px;` to `.admin-body` for both desktop and mobile viewports.
* **Changed Files**:
  - `frontend/src/components/Layout/AdminLayout.css`
