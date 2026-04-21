# Issue: Admin Analytics Export CSV Button Non-Functional

## Status
- **Priority**: High
- **Severity**: Major
- **Type**: Bug
- **Status**: Open
- **Assigned To**: Antigravity

## Description
The "Export CSV" button located on the Economic Analytics page (`/admin/analytics`) is completely non-functional. Clicking the button performs no action, as it lacks an `onClick` handler in the React component. Additionally, there is no corresponding backend endpoint identified specifically for CSV export of transaction data.

## Reproduction Steps
1. Log in as an administrator.
2. Navigate to `http://localhost:5173/admin/analytics`.
3. Click the "Export CSV" button in the header actions.
4. Observe that no file is downloaded and no network request is made.

## Expected Behavior
Clicking the "Export CSV" button should trigger a download of the system's economic data in CSV format.

## Actual Behavior
The button is visual only and does not trigger any action.

## Technical Details
- **Frontend File**: `frontend/src/pages/Admin/Analytics.jsx`
- **Missing Handler**: The `<button className="primary-btn">` at line 137 has no `onClick` property.
- **Backend Requirement**: A new endpoint (e.g., `/api/admin/export/transactions`) needs to be implemented to generate and serve the CSV file.

## Screenshots
![Analytics Page Export Button](file:///C:/Users/Ben/.gemini/antigravity/brain/8900e9b5-645e-4eaf-b088-72a0de865f7e/.system_generated/click_feedback/click_feedback_1776653701332.png)
