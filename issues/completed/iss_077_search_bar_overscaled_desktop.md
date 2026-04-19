# Header search bar is disproportionately wide on desktop

## Description
The search bar in the global header expands to fill a very large portion of the screen on high-resolution desktop viewports, which looks unbalanced and doesn't follow modern UI constraints.

## Steps to Reproduce
1. Open the application on a desktop browser with resolution 1440px or higher.
2. Observe the search bar in the top header.

## Expected Result
The search bar should have a `max-width` constraint to maintain a clean, balanced layout on large screens.

## Actual Result
The search bar is overly wide, making it look stretched and "unpolished".

## Impact
Medium - Affects the overall "premium" aesthetic and visual balance of the application.

## Screenshots
![Header Layout](file:///C:/Users/Ben/.gemini/antigravity/brain/4f231549-3ea7-4b97-9dbb-180fb4a072bc/.system_generated/click_feedback/click_feedback_1776257980342.png)

## Root Cause
The search bar container was using `flex-grow: 1` with a relatively high `max-width` (420px) and even higher focus-state `max-width` (450px). On large desktop resolutions, this allowed the search bar to expand more than necessary for its function, creating a visual imbalance compared to other header elements like the logo and user stats.

## Resolution
- Reduced `max-width` of `.user-search-container` from `420px` to `320px`.
- Reduced focused `max-width` from `450px` to `360px`.
- Adjusted horizontal margins from `2rem` to `1.5rem` to tighten the layout.

## Changed Files
- `frontend/src/components/Layout/Layout.css`

## Evidence
Captured confirmation that the search bar maintains a balanced width of approx 230px on 1440px viewport.
![Fixed Header](file:///C:/Users/Ben/.gemini/antigravity/brain/48466a53-8d23-42bc-b275-87076f2f3ae5/header_unfocused_1440px_1776310501811.png)

