# Project Edit Route Error UI Inconsistency

## Description
When a student attempts to access a project edit route (e.g., `/project/edit/1`) that is either forbidden or non-existent, the application displays a generic "Failed to load project details" error message within the standard project management UI. This is inconsistent with other restricted routes (like `/admin/*`) which show a dedicated "Access Denied" page.

## Steps to Reproduce
1. Log in as a student (`blossomstudent01`).
2. Navigate directly to `http://localhost:5173/project/edit/1`.
3. Observe the page loads but shows a "Failed to load project details" error instead of a permission-denied state.

## Expected Result
If the project ID does not belong to the user or is a restricted route, the app should show a clear "Access Denied" or "Project Not Found" page.

## Actual Result
The UI remains on the project manager page with a broken/empty state and a "Failed to load" error.

## Impact
Low - Minor UX inconsistency, but could lead to confusion about whether a project actually exists or if the system is simply broken.

## Screenshots
[Screenshot of project edit failure state]
