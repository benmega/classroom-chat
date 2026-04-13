# Issue: Achievements Page Lacks Grid Layout on Desktop

## Description
The Achievements page displays all items in a single vertical column, even on large desktop screens. This results in excessively wide achievement cards and a significant amount of wasted horizontal space, making the interface feel underdeveloped and non-premium.

## Impact
**Medium** - The visual presentation on desktop is suboptimal and does not follow modern UI patterns for collection-based views.

## Steps to Reproduce
1. Log in to the application.
2. Navigate to the Achievements page (`/achievements`).
3. View the page on a desktop resolution (1280px+).
4. Observe the single-column list of achievements.

## Visual Evidence
![Achievements Desktop Layout](file:///C:/Users/Ben/.gemini/antigravity/brain/c38fa112-84c3-4bc4-9ece-05170747e330/achievements_desktop_1775748918033.png)

## Proposed Fix
- Change the achievement list layout from a single column to a responsive grid.
- Use `display: grid` with `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` to automatically adjust columns based on screen width.
- Adjust card padding and font sizes to ensure they look proportional on larger screens.
