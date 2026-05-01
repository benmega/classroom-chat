# Medium: Overlapping Toast Notifications in Admin Layout

## Description
When multiple notifications or errors occur in the admin interface (e.g., auth errors and data fetching errors), toast notifications overlap each other, making them difficult to read.

## Steps to Reproduce
1. Trigger multiple asynchronous error events (e.g., navigate to a broken admin page while auth is failing).
2. Observe multiple toast notifications appearing in the same corner and overlapping.

## Expected Result
Toast notifications should stack vertically or have proper spacing and z-index management.

## Actual Result
Notifications overlap, blocking each other's content.

## Impact
Medium - Poor UX and reduced visibility of system feedback.

## Screenshots
![Overlapping Toasts](file:///C:/Users/Ben/.gemini/antigravity/brain/88abffad-61f3-424a-97ed-87817374f106/admin_dashboard_error_1776092400407.png)
*(Note: Screenshot shows multiple error states; overlapping toasts were observed during the live navigation phase.)*
