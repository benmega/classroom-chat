# Admin Sub-Routes Data Loading Failure

## Description
Several administrative sub-routes fail to load content, resulting in multiple "Failed to load" toast notifications. While the UI layout (sidebar, header) persists, the core data tables and components remain empty.

The following routes are affected:
- `/admin/pending-users` ("Failed to load pending users")
- `/admin/pending-trades` ("Failed to load pending trades")
- `/admin/certificates` ("Failed to load certificates")
- `/admin/documents` ("Failed to load document data")
- `/admin/advanced` ("Failed to load advanced panel views")

## Steps to Reproduce
1. Log in as an admin (`ben`).
2. Navigate to any of the affected routes (e.g., `/admin/pending-users`).
3. Observe the "Failed to load" error toast and the lack of content.
4. Check the network tab for failed requests to corresponding backend endpoints.

## Expected Result
Each administrative sub-page should load and display its respective data from the backend.

## Actual Result
The API calls return errors (likely 404 or 500), and the frontend displays a generic data failure state.

## Impact
Major - Most administrative management functions are currently non-functional.

## Screenshots
![Admin Dashboard Error](file:///C:/Users/Ben/.gemini/antigravity/brain/5aceb4c8-90d5-421e-b921-34c594004784/admin_dashboard_error_1775574234581.png)
![Admin Advanced Error](file:///C:/Users/Ben/.gemini/antigravity/brain/5aceb4c8-90d5-421e-b921-34c594004784/admin_advanced_error_1775574307947.png)
