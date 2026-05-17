# Issue: iss_013 - Mobile Project Card Admin Overlay Collision

## Description
On mobile devices, the "Edit" (Settings) overlay for admins on project thumbnails can be accidentally triggered when a user is trying to tap the thumbnail to open the details modal.

## Findings
- The "Edit" button (settings icon) is small and positioned in the top-right corner of the thumbnail.
- On touch devices, the "hover" state that shows the overlay is often triggered by the initial touch, and if the user's finger is slightly off-center, they might trigger the navigate-to-edit action instead of opening the modal.

## Impact
**Low/Medium** - Primarily affects admins/teachers using mobile devices.

## Suggested Fix
- On mobile viewports, remove the hover-based `edit-overlay` and instead provide a clear "Edit" button inside the project content area or footer, specifically for owners/admins.
- Alternatively, increase the padding/separation between the thumbnail tap area and the edit button.

## Screenshots
*(Refer to project portfolio component in mobile view)*


## Root Cause
The edit button was placed directly over the project thumbnail and triggered on hover, which caused touch-target collisions on mobile. The fix was to move the edit button entirely to the footer next to 'Details'.

## Changed Files
- frontend/src/components/profile/ProjectPortfolio.jsx