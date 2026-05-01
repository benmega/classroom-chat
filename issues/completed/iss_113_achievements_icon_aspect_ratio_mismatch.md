# iss_113_achievements_icon_aspect_ratio_mismatch
**Status**: Completed
**Resolution Date**: 2026-04-19

## Root Cause
The `.badge-wrapper` (128x128px) and the `.badge` sprite (128x128px) were inconsistent in how they handled non-square source assets (photos). For some badges, the container appeared rectangular due to lack of strict aspect-ratio enforcement, and the `.lock-overlay` (using `inset: 0` on a 100px base or inconsistent rounding) did not align properly with the badge.

## Changes
- **frontend/src/pages/General/Achievements.css**: Standardized `.badge-wrapper` and `.lock-overlay` to a consistent 120x120px square dimension.
- Scaled the 128px sprite badges down to 120px using `transform: scale(0.9375)` to ensure they fit perfectly within the wrapper and match the overlay.
- Enforced `overflow: hidden` and consistent `border-radius` (24px) for a modern, high-quality look.


## Description
Achievement icons and badges on the Achievements page are rendering as rectangular (portrait) images (approx. 100x128px), while the lock icons and other overlays remain square. This creates a visual mismatch where the overlay does not perfectly cover or align with the underlying badge image.

## Requirements
- Achievement badges/icons should be rendered as squares (e.g., 128x128px or 100x100px).
- All overlays (lock icons, progress indicators, hover effects) must match the dimensions and aspect ratio of the underlying achievement image.
- Ensure consistent aspect ratio across all screen sizes (desktop and responsive).

## Repro Steps
1. Navigate to the Achievements page.
2. Inspect the dimensions of any achievement badge.
3. Observe that they are taller than they are wide.
4. Observe that the lock icon (for locked achievements) does not align with the rectangular background.

## Verification Results (from initial audit)
- Verified on Desktop: Icons are 100x128px.
- Overlays are square, leading to empty space or misalignment on the top/bottom or sides.
