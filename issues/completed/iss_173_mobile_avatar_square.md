# Profile Avatar Rendered as Square Inside Circular Container

## Description
On the mobile profile page, the user's avatar image container is a circle, but the placeholder inside is rendered as a square, leaving a mismatched white background with a circular border around it. It does not have a premium or cohesive look.

## Steps to Reproduce
1. Log into the application.
2. Navigate to the Profile page (`/profile`).
3. View the profile on a mobile-sized viewport (e.g., iPhone 13 Pro).

## Expected Result
The avatar placeholder should be fully circular and fill its container, matching the circular border mask cleanly.

## Actual Result
The avatar placeholder displays as a white square inside a larger circular container with a background color and border, looking unpolished.

## Impact
Low - Visual aesthetic bug that reduces the premium feel of the mobile profile UI but does not break functionality.

## Screenshots
![Square Avatar Placeholder](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_profile.png)

## Root Cause
In `Profile.css`, the `@media (max-width: 768px)` media query incorrectly reduced the width and height of `.avatar-img` (the inner image) to 120px instead of `.avatar-wrapper` (the outer container which enforces the 50% border radius). This caused the image to shrink inside the 140px wrapper, failing to be clipped by the circular boundary and appearing as a square.

## Changed Files
- `frontend/src/pages/Profile/Profile.css`
