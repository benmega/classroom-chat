# Profile Picture Modal UI & Visual Issues

## Description
The profile picture selection modal has several UI and visual issues that need addressing.

## Visual Issues
1. **Padding/Spacing**: Strange padding in the modal—needs more padding at the bottom for the Save/Cancel buttons and less in other areas.
2. **Default Photo**: The default profile photo looks like "a photo in a photo," suggesting a nested image or incorrect masking/rendering.
3. **Blue Camera Icon Overlay**: A blue camera icon at the bottom of the profile picture area is creating a "circle in a circle" effect, which looks incorrect.

## Recommended Solution
1. Refine the CSS for the Profile Picture modal (spacing, padding).
2. Investigate the default photo asset or rendering logic to remove the "photo in photo" effect.
3. Fix the positioning and styling of the blue camera icon overlay (e.g., make it a neat badge or integrated icon).

## Impact
Low/Medium - Purely visual, but affects the "premium" feel of the profile customization.

## Resolution
- Adjusted `.modal-content` padding-top to 20px (from 40px) to balance spacing.
- Increased `.modal-footer` bottom padding in crop modal to 30px for better button clearance.
- Refined `.avatar-img` border (4px) and shadow for a cleaner look.
- Changed `.edit-pic-btn` from a circle to a squircle (border-radius: 10px) to eliminate the "circle in circle" effect and added a subtle hover rotation.
- Improved `crop-area` styling with a solid dark background for better contrast during cropping.

## Root Cause
The visual issues were caused by redundant circular masking on overlapping elements and insufficient specific padding for the crop-specific modal footer.

## Changed Files
- `frontend/src/pages/Profile/Profile.css`

