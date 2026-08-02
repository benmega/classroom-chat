# Issue: Desktop Recommendation Notice Banner Occupies Excessive Vertical Space on Mobile

## Issue ID
`iss_218_parent_mobile_desktop_recommendation_banner_disruption`

## Component / Page
- **Page**: Parent Dashboard (`/parent/dashboard`)
- **Viewport**: Mobile (`390x844`)

## Severity / Priority
- **Severity**: Low / Polish
- **Priority**: P3

## Description
Upon loading the Parent Dashboard on a mobile device, a full-width notice banner is rendered at the top of the main container stating: "For the best viewing experience, we recommend using a desktop device."

On a mobile screen with 844px total height, this warning banner consumes significant vertical real estate before the parent can see their children's activity or summary cards. Furthermore, the dismiss close icon (`X`) button is only `24x24px`, making it difficult to close on mobile touchscreens.

## Steps to Reproduce
1. Set browser viewport to mobile width (`390x844`).
2. Authenticate as parent and go to `/parent/dashboard`.
3. View the top banner notification.

## Expected Behavior
Mobile UI should be natively responsive without warning users to switch to desktop, or should display a compact, easily dismissible notice with a `>= 44x44px` dismiss touch target.

## Actual Behavior
The desktop recommendation banner dominates the top viewport fold on mobile, requiring extra scrolling to reach child activity cards.
