# Issue: Parent Mobile UI Missing Main Navigation Drawer Menu

## Issue ID
`iss_216_parent_mobile_navigation_drawer_missing`

## Component / Page
- **Page**: Header / Global Navigation across Parent Views (`/parent/dashboard`, `/parent/report/*`, `/chat`, `/profile`)
- **Viewport**: Mobile (`390x844`)

## Severity / Priority
- **Severity**: High
- **Priority**: P1

## Description
When accessing the parent portal on a mobile viewport (390x844), there is no accessible slide-out navigation drawer or mobile sidebar for navigating between Parent Dashboard, Child Progress Reports, Chat/Messages, and Settings. 

While the header displays a `profile-toggle` hamburger icon button, clicking it only toggles a small profile menu dropdown containing "Profile" and "Logout", but completely lacks standard navigation links (e.g. Dashboard, Child Reports, Chat). On mobile viewports, the desktop navigation rail/bar is hidden (`display: none`), leaving parent users with no visible navigation controls to switch between key features.

## Steps to Reproduce
1. Open a mobile browser or emulator set to `390x844` viewport size.
2. Authenticate as a parent via `http://localhost:8000/dev-login?role=parent`.
3. Observe the header on `http://localhost:5173/parent/dashboard`.
4. Click the top-right menu toggle button (`data-testid="profile-toggle"`).
5. Observe the dropdown options.

## Expected Behavior
The header should feature a mobile navigation drawer or expandable navigation menu allowing mobile parent users to easily navigate to Dashboard, Child Progress Reports, Chat, and Settings.

## Actual Behavior
The desktop navigation bar is omitted/hidden, and the top-right button only toggles a dropdown with user profile info and logout. Users must manually type URLs or click embedded cards to navigate.

## Visual / Layout / Touch Notes
- Mobile Header Target: `button[data-testid="profile-toggle"]` has size `36x36px`, which is below the WCAG 44x44px minimum touch target guideline.
