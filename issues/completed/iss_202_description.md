# User Directory Pagination Controls Misaligned on Mobile

## Description
At the bottom of the User Directory table, the pagination controls ("Showing 1-X of Y users" and the Previous/Next buttons) are squished and poorly aligned on mobile viewports. The layout breaks as the text and the buttons cram into a single row without enough space.

## Steps to Reproduce
1. Log in to an Admin account.
2. Emulate a mobile viewport (e.g., 390x844px).
3. Navigate to the User Directory page (`/admin/users`).
4. Scroll to the bottom of the user table and inspect the pagination footer.

## Expected Result
The pagination footer should respond to mobile widths, perhaps stacking the "Showing X of Y" text above or below the pagination buttons to ensure it looks clean and readable.

## Actual Result
The text and buttons are forced into a single line, causing the text to wrap awkwardly and squishing the layout.

## Impact
Low - The buttons remain clickable, but the UI is unpolished and visually broken.

## Screenshots
![User Directory Pagination Misaligned](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_201_admin_users.png)
