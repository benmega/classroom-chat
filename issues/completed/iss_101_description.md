# Parent Dashboard and Report Headers are Misaligned on Mobile

## Description
The main header containers on both the Parent Dashboard (`ParentDashboard.jsx`) and the Student Report Card (`ParentReportCard.jsx`) are misaligned and fail to fit within the viewport on mobile devices.

## Steps to Reproduce
1. Log in as a Parent.
2. View the Parent Dashboard on a mobile viewport (e.g., width 390px).
3. Observe that the top header (with the "Add Child" and "Sign Out" buttons) overflows to the left.
4. Click on a child to view their report card.
5. Observe the report card header. The child's name and avatar overflow to the right edge and the container is misaligned.

## Expected Result
Headers should be responsive, properly centered, and contain all elements neatly within the mobile viewport width using appropriate flexbox wrapping or scaling.

## Actual Result
The headers are shifted and overflow the screen, causing content (like the child's long username) to clip off the edge of the device.

## Impact
Medium - The visual layout is broken and unpolished on small screens.

## Screenshots
![Parent Report Header Overflow](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/parent_report_mobile.png)
