# Issue: Advanced Panel Uses Standard Checkboxes Instead of Toggle Switches

## Status
- **Priority**: Low
- **Severity**: Aesthetic
- **Type**: UI/UX
- **Status**: Open
- **Assigned To**: Antigravity

## Description
The Advanced Panel (Flask-Admin) uses standard HTML checkboxes for boolean fields (e.g., `Is Admin`, `Is Approved`), whereas the primary React Dashboard uses modern toggle switches. This inconsistency makes the Advanced Panel feel dated and less "premium" compared to the main application.

## Reproduction Steps
1. Log in as an administrator.
2. Navigate to "Advanced Panel" from the sidebar.
3. Click on "Users" and then click "Edit" on any user record.
4. Observe the checkboxes for `Is Admin` and `Is Approved`.

## Expected Behavior
The Advanced Panel should use a custom template or override to display boolean fields as modern toggle switches, matching the design aesthetic of the React dashboard.

## Actual Behavior
Basic browser-default checkboxes are used.

## Technical Details
- **Backend File**: `backend/application/routes/admin_advanced_routes.py`
- **Solution**: Implement a custom field renderer for `BooleanField` in `SecureModelView` or use a Flask-Admin theme that supports toggles.
