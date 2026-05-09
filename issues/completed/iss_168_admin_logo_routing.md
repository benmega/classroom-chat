# Admin Panel Logo Reloads Admin Dashboard

## Description
Clicking the main application logo while inside the Admin Panel reloads the Admin Dashboard instead of returning the user to the main application dashboard.

## Steps to Reproduce
1. Navigate to the Admin Panel.
2. Click on the main logo in the header or sidebar.
3. Observe the resulting navigation.

## Expected Result
Clicking the main logo should act as a "Home" button, navigating the user back to the primary user dashboard (`/`).

## Actual Result
The user is kept within the Admin Panel and the admin dashboard is simply reloaded.

## Impact
Low - A user flow issue that creates a minor navigation trap for administrators.
