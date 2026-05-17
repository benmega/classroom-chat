# Issue: iss_012 - Mobile Slideshow Navigation and Layout Issues

## Description
The Digital Notebook slideshow is partially broken on mobile viewports.

## Findings
- **Navigation Arrows**: The "Next" and "Prev" arrows are either missing, positioned off-screen, or have zero opacity on mobile devices.
- **Image Scaling**: Images use `object-fit: cover`, which often crops critical parts of student notes/work.
- **Positioning**: Inherits the same positioning bug as other modals (rendered at document top).

## Impact
**Medium** - Makes the "Digital Notebook" feature nearly unusable on mobile.

## Suggested Fix
- Ensure navigation arrows are visible and properly positioned for touch in the mobile media query.
- Change `object-fit: cover` to `object-fit: contain` for the slideshow images on mobile to ensure the entire note is visible.
- (Prerequisite) Fix the modal positioning bug.

## Screenshots
![Mobile Slideshow Issues](file:///C:/Users/Ben/.gemini/antigravity/brain/0a1aab7a-4728-452d-8d76-a356f2e1ae0b/mobile_slideshow_forced_1778901518894.png)


## Root Cause
Missing CSS rules for `.nav-slide` and `.slide-content`. The arrows had no absolute positioning, opacity, or size. The images defaulted to generic object-fit instead of `contain`.

## Changed Files
- frontend/src/pages/Profile/Profile.css