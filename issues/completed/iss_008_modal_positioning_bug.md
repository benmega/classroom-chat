# Issue: iss_008 - Profile Modals Positioned at Document Top instead of Viewport

## Description
Modals on the Profile page (`ProjectModal`, `NoteSlideshow`, and `PfpCropModal`) are appearing at the absolute top of the document rather than centered in the current viewport when the user is scrolled down. On mobile devices, where pages are much longer, this renders the modal completely invisible (often at a negative offset of -2000px or more), effectively breaking all modal-based functionality.

## Reproduction Steps
1. Navigate to a user profile (e.g., `/profile/anda`).
2. Scroll down to the bottom of the page (e.g., to the "Digital Notebook" section).
3. Click on a project or a note to open its modal/slideshow.
4. Observe that the modal overlay is not visible in the current viewport; it is rendered at the top of the page.

## Technical Analysis
The `.profile-page` container has a `fadeIn` animation that uses `transform: translateY`. In CSS, any element with a `transform` property becomes the containing block for all its descendants, including those with `position: fixed`. On mobile, the longer page length exacerbates this, as `top: 0` is pinned to the start of the `.profile-page` div at the top of the document.

## Impact
**High** - Degrades UX significantly as users must hunt for the modal.

## Suggested Fix
Move the modal components (`ProjectModal`, `NoteSlideshow`, `PfpCropModal`) outside of the `.profile-page` div, or use a React Portal to render them at the document body level. Alternatively, remove the `transform` from the `fadeIn` animation on the `.profile-page` container.

## Screenshots
![Modal off-screen](file:///C:/Users/Ben/.gemini/antigravity/brain/0a1aab7a-4728-452d-8d76-a356f2e1ae0b/project_modal_logic_visible_1778900035570.png)
*(Note: In this screenshot, the subagent had to scroll up to capture the modal)*


## Root Cause
The `.profile-page` component wrapped the modal components. The CSS `fadeIn` animation on `.profile-page` used a `transform: translateY`, establishing a new containing block for all descendants. This trapped the fixed-position modals inside the `.profile-page` block instead of the viewport.

## Changed Files
- frontend/src/pages/Profile/index.jsx