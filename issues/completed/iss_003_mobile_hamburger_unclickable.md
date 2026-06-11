# Mobile Hamburger Menu Unclickable

## Description
The mobile hamburger menu button (used to toggle the sidebar) is present in the DOM (`.hamburger-toggle.mobile-only`) and visually rendered on the screen. However, it cannot be interacted with. Automation testing (Playwright) reports the element as "not visible" when attempting to click it, which typically indicates it is blocked by another invisible overlay, has a z-index issue, or is obscured by a transparent element.

## Steps to Reproduce
1. Load the application on a mobile viewport (e.g., width 390px).
2. Look at the top-left corner of the header for the hamburger menu icon.
3. Attempt to tap/click the hamburger menu.

## Expected Result
The hamburger menu should be clickable and successfully toggle the mobile sidebar navigation.

## Actual Result
The button is unclickable due to being blocked or hidden by another layer/element.

## Impact
Critical - The sidebar is the primary method of navigation. If the hamburger menu cannot be clicked, mobile users cannot navigate the app effectively.

## Screenshots
![Hamburger Menu Visible but Unclickable](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_audit/01_dashboard.png)
