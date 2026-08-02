# Issue: Undersized Touch Targets on Parent Mobile Views

## Issue ID
`iss_217_parent_mobile_undersized_touch_targets`

## Component / Page
- **Page**: Parent Dashboard, Child Reports (`/parent/report/*`), Profile (`/profile`), Chat (`/chat`)
- **Viewport**: Mobile (`390x844`)

## Severity / Priority
- **Severity**: Medium
- **Priority**: P2

## Description
Multiple interactive elements and buttons across the Parent Mobile UI have touch target sizes smaller than the recommended minimum of 44x44 pixels (WCAG 2.1 AA / Apple iOS Human Interface Guidelines). This makes tapping elements difficult and error-prone on touchscreen devices.

Specifically:
1. Top-right Account/Menu Toggle (`button[data-testid="profile-toggle"]`): `36x36px`
2. Notice Dismiss Button on Dashboard (`button`): `24x24px`
3. Link Another Child Button on Dashboard (`button`): `28x28px`
4. Child Card Options Button (`button`): `32x32px`
5. Back to Dashboard Button on Child Report (`button`): `32x32px`
6. Course Track Selector Dropdown on Child Report (`select`): height `28px`
7. Request Track Change Button on Child Report (`button`): height `39px`
8. Edit Profile Button on Profile Page (`button`): `30x30px` & height `32px`

## Steps to Reproduce
1. Set viewport to mobile (`390x844`).
2. Log in as parent and navigate to `/parent/dashboard`, `/parent/report/0`, and `/profile`.
3. Inspect interactive buttons and form controls with browser DevTools.
4. Measure computed layout dimensions (`getBoundingClientRect()`).

## Expected Behavior
All interactive buttons, links, and select dropdowns on mobile viewports should have minimum touch target dimensions of at least 44x44px (or padding/margin expanding the hit area).

## Actual Behavior
Interactive controls range from 24px to 39px in height, making them difficult to hit accurately on touch screens.
