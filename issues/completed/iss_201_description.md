# User Directory Table Columns Cut Off on Mobile

## Description
On the Admin User Directory page, the main user table is unresponsive to mobile screen widths. The columns (specifically the "Economy" column on the right side) are cut off and overflow beyond the screen edge, preventing the admin from viewing or interacting with all table data.

## Steps to Reproduce
1. Log in to an Admin account.
2. Emulate a mobile viewport (e.g., 390x844px).
3. Navigate to the User Directory page (`/admin/users`).
4. Look at the User Profile table at the bottom of the page.

## Expected Result
The data table should be fully responsive. On mobile, it should either allow horizontal scrolling (e.g., using `overflow-x: auto`), or the columns should stack vertically for a mobile-friendly view.

## Actual Result
The table extends past the right edge of the viewport, completely cutting off the "Economy" column with no way to scroll to it.

## Impact
Major - Core data is inaccessible to admins on mobile devices, preventing them from viewing or managing the users' economy status.

## Screenshots
![User Directory Table Cut Off](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_201_admin_users.png)
