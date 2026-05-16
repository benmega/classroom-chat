# Issue: iss_011 - Mobile Tap Target Sizes for Close Buttons

## Description
The close button ("X") in the `ProjectModal` and `NoteSlideshow` is too small for reliable touch interaction on mobile devices.

## Findings
- Current size: **40x40px**.
- Mobile standard (Apple/Google): **Minimum 44x44px**.
- This makes it difficult for users with larger fingers to close modals accurately.

## Impact
**Medium** - Frustrates mobile users when they can't easily dismiss a modal.

## Suggested Fix
Increase the width and height of `.close-modal` and `.close-slideshow` to at least **44px** in the mobile media query of `Profile.css`. Ensure the hit area is also expanded if the visual size remains small.

## Screenshots
*(Refer to mobile audit recordings for interaction feedback)*


## Root Cause
The close buttons were explicitly sized to 40x40px, missing the mobile standard of 44x44px. The media query lacked rules to enlarge them on touch devices.

## Changed Files
- frontend/src/pages/Profile/Profile.css