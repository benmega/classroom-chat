# Parent Header Search Input and Quick Actions Omitted in Layout

## Description
In `Layout.jsx`, header controls such as user search (`<UserSearch />`) and navigation items are conditionally hidden for parent users via `user.role !== 'parent'`. While gamified student statistics (Ducks/Packets) are intentionally omitted for parents, parents are also left with no search bar in the header to quickly locate linked students, view system notifications, or access support options on Desktop viewports.

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Inspect the global top header bar on Desktop viewport (1440x900).
3. Observe the middle and right sections of the navigation bar.

## Expected Result
The header bar should provide parent-relevant quick tools, such as student search, quick notification indicators, or a dedicated parent help badge.

## Actual Result
The top header bar displays only the brand logo and profile dropdown button, leaving the middle layout bar completely empty.

## Impact
Low/Medium - Decreases desktop navigation utility and header visual completeness for parent users.

## Screenshots
![Parent Header Empty Controls](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_216_parent_dashboard_desktop.png)
