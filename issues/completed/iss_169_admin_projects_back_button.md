# Admin: Project Review Header Back Button Broken

## Description
When reviewing a student project at `/admin/projects`, the standard back button in the header is non-functional because its `backPath` is set to `#`.

## Steps to Reproduce
1. Go to Admin -> Projects.
2. Click on a project to review it.
3. Click the "Back" button in the top-left header.
4. Observe that the URL changes to include `#` but the view does not return to the project list.

## Expected Result
Clicking the header back button should return the user to the project list view.

## Actual Result
The button does nothing but append a hash to the URL.

## Impact
Minor - There is a second "Back to List" button that works, but the primary UI navigation element is broken.
