# Mobile Achievements Title Overflow

## Description
On the mobile view of the Achievements page, the "Hall of Achievements" title is too large and does not wrap properly, causing the text to overflow horizontally off the edge of the card container.

## Steps to Reproduce
1. Log into the application.
2. Navigate to the Achievements page (`/achievements`).
3. View the page on a mobile-sized viewport.

## Expected Result
The title text "Hall of Achievements" should wrap gracefully or scale down in size so that it fits entirely within the white card container.

## Actual Result
The word "Achievements" overflows the right boundary of the white card, breaking the layout and clipping.

## Impact
Medium - A highly visible UI bug on a core page that negatively affects the mobile aesthetic and readability.

## Screenshots
![Achievements Title Overflow](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_achievements.png)

## Root Cause
The h1 element inside the .ach-brand container had a fixed font size of 2.2rem which did not wrap on smaller viewports. Additionally, the .ach-controls container had substantial padding, leaving limited horizontal space for the text on narrow mobile screens.

## Changed Files
- rontend/src/pages/General/Achievements.css

