# iss_111_admin_approvals_button_contrast
**Status**: Completed
**Priority**: Medium
**Type**: UI/UX

## Description
In the Admin panel, specifically within "Pending Users" (User Approvals) and "Pending Trades", there is a major design and contrast flaw regarding call-to-action buttons. 

## Requirements
- The "Approve Account" button (and potentially other action buttons) shares the same background color as the card itself when not hovered, rendering it nearly invisible to the user.
- Increase the contrast of these buttons so they are easily discoverable and identifiable without needing to be hovered over.

## Resolution
### Root Cause
The `PendingUsers.css` file was using undefined CSS variables (e.g., `var(--primary)`, `var(--surface)`, `var(--text)`) instead of the standardized variables defined in `variables.css` (e.g., `var(--primary-color)`, `var(--bg-primary)`, `var(--text-primary)`). This caused the "Approve Account" button background to fall back to transparent, making it invisible against the white card background since the text was also white.

### Changes
- Updated `frontend/src/pages/Admin/PendingUsers.css`:
  - Replaced all broken `var(--...)` references with correct global variables.
  - Enhanced `.btn-approve` with a primary background color, white text, and a soft shadow for better discoverability.
  - Improved `.btn-reject` aesthetics and hover states.
- Updated `frontend/src/pages/Admin/PendingTrades.css`:
  - Added shadows and vibrant hover states to "Approve Trade" and "Reject" buttons to ensure they stand out as primary call-to-actions.

### Verification Results
- Logged in as Admin via `/dev-login`.
- Verified "User Approvals" page: "Approve Account" buttons are now vibrant turquoise with high contrast.
- Verified "Pending Trades" page: "Approve Trade" buttons are clearly visible and interactive.
- Confirmed no regressions in layout or other admin components.

### Evidence
- Screenshot of fixed Approve Account buttons: [admin_approve_account_v2.png](file:///c:/Users/Ben/.gemini/antigravity/brain/4104e5dd-d014-4349-a7d1-f2569e899c5b/screenshots/admin_approve_account_v2.png) (captured during verification)
