# Issue: Achievements Page Redirects to Backend JSON

## Metadata
- **Status**: Open
- **Priority**: High
- **Category**: Functional / Routing
- **Viewport**: Desktop (and likely Mobile)

## Description
When navigating to the Achievements page (/achievements) as a student user on desktop, the application redirects the browser to `http://localhost:8000/achievements/`, which is the backend API endpoint. This results in the user seeing raw JSON data instead of the intended frontend user interface.

## Steps to Reproduce
1. Log in as a student user (e.g., `blossomstudent01`).
2. Navigate to the Achievements page by clicking the link in the sidebar menu or profile dropdown.
3. Observe that the URL in the address bar changes to `http://localhost:8000/achievements/`.
4. Observe the raw JSON response displayed in the browser.

## Expected Behavior
The browser should remain on the frontend domain (e.g., `http://localhost:5173/achievements`) and render the Achievements component with a premium grid layout.

## Actual Behavior
The user is redirected away from the frontend application to the raw backend API.

## Visual Proof
![Achievements JSON Leak](file:///C:/Users/Ben/.gemini/antigravity/brain/f3b6e1a1-61ea-478c-80a2-709cc822763c/achievements_page_bug_1775880906797.png)
*Screenshot shows raw JSON data from the backend.*

## Environment
- **Browser**: Chrome (via browser_subagent)
- **Viewport**: 1440x900
- **Frontend Port**: 5173
- **Backend Port**: 8000
