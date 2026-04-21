# Issue: Admin Modal Input Fields Too Narrow

## Status
- **Priority**: Medium
- **Severity**: Minor
- **Type**: UI/UX
- **Status**: Open
- **Assigned To**: Antigravity

## Description
Text entry fields in administrative modals (e.g., "Add User", "Adjust Duck Balance", "Reset Password") are extremely narrow, occupying only a fraction of the available modal width. This makes them difficult to use for longer inputs and creates a sub-optimal visual experience that doesn't feel "premium."

## Reproduction Steps
1. Log in as an administrator.
2. Navigate to `http://localhost:5173/admin` or `http://localhost:5173/admin/users`.
3. Click "Add User" or "Adjust Balance" to open a modal.
4. Observe the width of the input fields relative to the modal width.

## Expected Behavior
Input fields should expand to 100% of the available width within the modal for better usability and visual balance.

## Actual Behavior
Input fields appear to have a narrow default width (approx. 1/3 of the modal width).

## Technical Details
- **CSS File**: `frontend/src/pages/Admin/AdminDashboard.css`
- **Selector**: `.admin-form .form-group input`
- **fix**: Add `width: 100%` to the input, select, and textarea elements within `.admin-form .form-group`.

## Screenshots
![Narrow Modal Inputs](file:///C:/Users/Ben/.gemini/antigravity/brain/8900e9b5-645e-4eaf-b088-72a0de865f7e/.system_generated/click_feedback/click_feedback_1776653330442.png)
