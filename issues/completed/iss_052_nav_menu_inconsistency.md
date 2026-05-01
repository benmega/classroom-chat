# Bug: Navigation Menu Position Inconsistency (Mobile)

## Description
The position and container of the mobile hamburger menu are inconsistent between the Dashboard and Admin pages. On the Dashboard, the menu is located within the chat header (middle-page), while on Admin pages, it is correctly placed at the top-left of the main header.

## Steps to Reproduce
1. Open the app on a mobile viewport (e.g., 375px).
2. Go to the Dashboard and locate the hamburger menu.
3. Go to Admin HQ and locate the hamburger menu.
4. Compare the positions.

## Expected Result
The navigation menu should be in a consistent location (top-left) across all main pages to follow expected mobile UX patterns.

## Actual Result
Menu position shifts between pages.

## Impact
**Low (UX/Consistency).** Confuses users who expect a predictable navigation pattern.

## Screenshots
![Dashboard Mobile Menu](C:\Users\Ben\.gemini\antigravity\brain\45962e20-3f07-4658-83d8-1275bab4fbd0\dashboard_mobile_sidebar_open_1775705925217.png)
![Admin Mobile Menu](C:\Users\Ben\.gemini\antigravity\brain\45962e20-3f07-4658-83d8-1275bab4fbd0\admin_mobile_sidebar_open_1775705908377.png)
