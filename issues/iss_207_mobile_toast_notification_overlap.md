# Mobile Toast Notification Overlaps Critical UI

## Description
The "Login successful!" toast notification appears at the bottom center of the screen on mobile viewports. For users like Parents, this massive notification completely obscures critical primary call-to-action buttons, such as the "Connect" button on the Parent Dashboard.

## Steps to Reproduce
1. Log in to the application as a Parent (`test_parent`).
2. Observe the Parent Dashboard immediately after login on a mobile viewport.

## Expected Result
Toast notifications should either be non-intrusive (e.g., appearing at the top of the screen) or auto-dismiss quickly without blocking primary interactions.

## Actual Result
The green toast notification is very large and positioned over the "Connect" button, preventing the user from interacting with it until the toast disappears.

## Impact
Medium - Blocks primary user flows temporarily, creating a frustrating user experience.

## Screenshots
![Toast Overlap](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_parent_dashboard.png)
