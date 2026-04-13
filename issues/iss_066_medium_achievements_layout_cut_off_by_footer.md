# [Medium] Achievements Grid Cut Off by Page Footer on Desktop

## Description
On the Achievements page, the bottom row of achievement cards is partially obscured by the "© 2026 Classroom Chat" footer on large desktop viewports (1440px). This indicates a lack of proper padding or a height calculation issue in the main content container.

## Steps to Reproduce
1. Log in as a student or admin.
2. Navigate to the Achievements page.
3. Scroll to the bottom of the grid.
4. Observe the interaction between the cards and the footer.

## Expected Result
There should be sufficient white space (padding/margin) between the last row of cards and the footer to ensure all content is fully visible and clickable.

## Actual Result
The footer overlaps the bottom portion of the final row of achievement cards.

## Impact
Medium - Visual polish issue that makes the application feel less premium and slightly affects usability for the last few items.

## Screenshots
![Achievements Layout Issue](file:///C:/Users/Ben/.gemini/antigravity/brain/f6577acb-c2e9-484a-867c-f71784390afc/.tempmediaStorage/media_f6577acb-c2e9-484a-867c-f71784390afc_1776012477308.png)
