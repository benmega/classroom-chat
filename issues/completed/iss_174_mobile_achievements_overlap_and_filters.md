# Achievements Page Header Overlap and Filter Layout issues on Mobile

## Description
Two distinct layout issues occur on the Achievements page (`/achievements`) on mobile viewports:
1. The page header title "Hall of Achievements" overlaps with the award/ribbon circular icon on the left.
2. The badge filter buttons (`All`, `Ducks`, `Certificate`, `Progress`, `Project`, `Session`) stack vertically in a single column instead of wrapping or scrolling horizontally, taking up excessive vertical screen space.

## Steps to Reproduce
1. Log in to the application (e.g., using `dev-login?role=admin`).
2. Set the browser viewport width to mobile dimensions (e.g., 390px).
3. Navigate to `/achievements`.
4. Observe the overlapping header title/icon and the vertical stack of filter buttons.

## Expected Result
1. The title and ribbon icon should have sufficient spacing and not overlap.
2. The filter buttons should wrap onto multiple rows or scroll in a horizontal row to conserve screen space.

## Actual Result
1. The ribbon icon is rendered underneath/behind the title text.
2. The filters form a long vertical list of buttons.

## Impact
Medium - Poor visual polish and suboptimal usability on mobile screens.

## Screenshots
![Achievements Page Layout Issues on Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_achievements.png)

## Root Cause
1. **Overlap**: The .ach-brand svg lacked lex-shrink: 0, causing it to shrink and overlap with the title text when horizontal space was constrained.
2. **Filters Stacking**: The .filter-scroll container was lacking horizontal scrolling, and the filter chips were allowed to wrap instead of forming a scrollable horizontal row.

## Changed Files
- rontend/src/pages/General/Achievements.css

