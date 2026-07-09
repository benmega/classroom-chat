# Missing Navigation Header on Social Feed Mobile View

## Description
When viewing the Social Feed (Chat) on a mobile viewport, the entire top navigation header (including the hamburger menu) is completely missing.

## Steps to Reproduce
1. Log in to the application.
2. Navigate to the Chat / Social Feed page.
3. Ensure the viewport width is set to a mobile dimension (e.g., 390px).

## Expected Result
The top navigation header should be visible, allowing the user to open the menu and navigate to other parts of the application seamlessly.

## Actual Result
The navigation header is completely absent, trapping the user on the Social Feed page without any intuitive way to navigate away via the application UI.

## Impact
Critical - Users are unable to navigate away from the Social Feed using the UI, trapping them on this page and breaking the user flow.

## Screenshots
![Missing Navigation Header](screenshots/admin_chat_mobile.png)

## Technical Analysis & Proposed Fix
* **Root Cause**:
  - In `Layout.jsx`, the header gets the class `mobile-hidden` if the route is the chat page (`isChatPage ? 'mobile-hidden' : ''`).
  - In `Layout.css`, `header.mobile-hidden` is styled with `display: none;` on screen widths under 800px.
  - Furthermore, `Layout.jsx` omits rendering `<aside className="mobile-sidebar">` when `isChatPage` is true.
* **Proposed CSS & Code Fix**:
  - Update `Layout.jsx` to render the header and hamburger menu toggle on `/chat` for mobile viewports, or remove the `mobile-hidden` class.
  - Ensure `Layout.jsx` renders the mobile drawer/sidebar even when `isChatPage` is true so the menu can be opened.
