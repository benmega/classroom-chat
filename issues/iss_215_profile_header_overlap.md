# Profile Header Layout Overlap

## Description
The user's name ("Mr. Mega"), handle ("@ben"), and "Edit Profile" button overlap directly with the profile banner image instead of sitting below it.

## Steps to Reproduce
1. Navigate to `/profile/mr-mega`.
2. View the header section.

## Expected Result
Profile textual info should be positioned below the banner image in the white space area, clearly readable.

## Actual Result
The text renders straight onto the banner image, clashing with the banner graphics and cutting into the dark areas.

## Impact
Medium - Aesthetic and readability issue.

## Screenshots
![Profile Header Overlap](file:///C:/Users/Ben/.gemini/antigravity/brain/d5795b34-a7bc-4bbb-b110-494656adce59/profile-page-bug.png)

## Technical Analysis & Proposed Fix
* **Root Cause**:
  - The negative margin `margin-top: -60px` defined on `.profile-header-content` shifts the entire header container up to overlap the background banner image.
  - While this is intended on desktop to partially overlay the avatar, on mobile viewports (where `flex-direction` shifts to `column`), this negative margin pulls the textual name, handle, and action buttons upward as well, positioning them directly on top of the banner graphic instead of in the readable content area below.
* **Proposed CSS & Code Fix**:
  - Adjust the mobile media query in `Profile.css` for `.profile-header-content` to remove or reduce the negative margin, or position only the avatar wrapper using absolute positioning so the text elements remain correctly flow-aligned in the light-colored body section.
