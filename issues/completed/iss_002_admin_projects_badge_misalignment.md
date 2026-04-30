# Issue: Project Badge Vertical Text Misalignment

## Status
- **ID**: `iss_002`
- **Severity**: Low
- **Category**: Visual Consistency
- **Component**: AdminProjects (`PendingIndicator`)

## Description
The "Review Needed" badge on the Project Management cards has a vertical alignment issue. While the badge height is 27.2px and line-height is 19.2px, the text appears visually high within the container, likely due to a baseline offset or lack of flexible centering.

### Findings
- **Badge Height**: 27.2px
- **Line Height**: 19.2px
- **Font Size**: 12px
- **Observation**: The text is not perfectly centered vertically. Additionally, the badges are absolutely positioned in the top-left corner of the project cards, which sometimes causes overlapping with project thumbnails that lack padding.

## Impact
- **Aesthetics**: Minor "unpolished" feel on a critical moderation page.

## Steps to Reproduce
1. Navigate to `/admin/projects`.
2. Look at any project card with the "Review Needed" status.
3. Observe the vertical positioning of the text inside the red badge.

## Proposed Fix
- Change the badge CSS to use `display: flex; align-items: center; justify-content: center;` instead of relying on `line-height`.
- Increase the padding or adjust the `top/left` positioning to avoid tight clipping with card borders.

## Screenshots
- [admin_layout_audit_recording](file:///C:/Users/Ben/.gemini/antigravity/brain/f592d7be-5ddb-4b13-ae66-ed2afc1bc396/admin_layout_audit_screenshots_1776915835592.webp)
