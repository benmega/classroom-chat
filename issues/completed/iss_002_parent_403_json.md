# 403 Errors Should Return JSON for Parent Unlinked Errors

## Description
Currently, when a parent attempts to view a report card of an unlinked student, the backend returns a raw text string ('Access denied...') and a 403 status. This forces the frontend to render a generic string. Consider explicitly typing these errors on the backend using structured JSON (e.g. {'error': 'Access denied...'}) so the frontend can display contextual icons or illustrations for this specific empty state.

## Steps to Reproduce
1. Log in as Parent.
2. Go to a child's report card who is not linked.
3. Observe the raw error string.

## Expected Result
Backend returns a JSON object.

## Actual Result
Backend returns a plain string.

## Impact
Low - UI enhancement for edge case.
## Verification Results
- Updated backend parent_routes.py to return JSON objects for 403 Access Denied errors.
- Updated frontend ParentReportCard.jsx to handle JSON errors and display a specific UserX empty state when the student is not linked.
