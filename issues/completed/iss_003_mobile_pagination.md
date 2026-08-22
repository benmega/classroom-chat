# Enhance Table Pagination on Mobile Devices

## Description
The DuckTransactions and Users tables have pagination controls that stack vertically on mobile. While functional, ensuring the Previous/Next buttons span the full width of the viewport (width: 100%) on devices < 400px would make one-handed operation significantly easier.

## Steps to Reproduce
1. Go to Admin Dashboard -> Users.
2. Resize viewport to < 400px.
3. Check pagination buttons at the bottom.

## Expected Result
Buttons should span full width on narrow screens.

## Actual Result
Buttons stack or are squished.

## Impact
Low - Usability issue.

## Verification Results
- Added max-width 400px media queries to DuckTransactions.css and Users.css.
- Verified visually and via automated tests.
