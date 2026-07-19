# Family Member "Options" Button is Non-Functional

## Description
On the Parent Dashboard, underneath "Family Members", each child has an "Options" button next to their name. Clicking this button does nothing.

## Steps to Reproduce
1. Log into a Parent account.
2. Navigate to the Dashboard.
3. In the "Family Members" section, click the "Options" button for any listed family member.

## Expected Result
A dropdown menu, modal, or new page should appear allowing the parent to configure settings, edit, or unlink the child account.

## Actual Result
No action occurs. The button is unresponsive and does not trigger any UI changes.

## Impact
Medium. Parents cannot manage their children's accounts or access any settings that should be available behind this options menu.

## Screenshots
![Dashboard Options Button](c:/Users/Ben/AntiGravity/classroom-chat/issues/dashboard_screenshot.png)

## Root Cause & Resolution
- **Why it happened:** The `onClick` handler on the `<button>` element did not call `e.stopPropagation()` or `e.preventDefault()`, nor did the button specify `type="button"`. This allowed click events to bubble unpredictably and in some cases trigger default browser or React synthetic event bubbling that reset the `openMenu` state (from the parent `onClick={() => setOpenMenu(null)}`) immediately after it opened.
- **Changed files:**
  - `frontend/src/pages/Parent/ParentDashboard.jsx` (Added `type="button"`, `e.preventDefault()`, and `e.stopPropagation()` to the options menu button).
