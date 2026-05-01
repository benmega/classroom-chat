# Admin Root Direct Navigation Unstable

## Description
Direct navigation to the root `/admin` URL often returns raw JSON data instead of rendering the Admin Dashboard UI. The UI only reliably loads via internal client-side navigation (e.g., clicking on the link from the profile menu).

## Steps to Reproduce
1. Log in as an admin.
2. Directly enter `http://localhost:5173/admin` into the address bar and press Enter.
3. Observe if raw JSON is returned or if the dashboard fails to mount properly.

## Expected Result
Direct navigation to `/admin` should return the React frontend application (usually `index.html`), allowing the app to handle the client-side routing and display the Admin Dashboard.

## Actual Result
The server intercepts the request and responds with what appears to be backend API data, bypassing the frontend UI entirely.

## Impact
Major - Broken navigation and confusing user experience for admins attempting to access the dashboard directly or via bookmarks.

## Screenshots
[JSON response on /admin]
