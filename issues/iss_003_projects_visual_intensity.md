# Issue: High Saturation in Project Review Cards

## Status
- **ID**: iss_003
- **Severity**: Low
- **Type**: Aesthetic Polish
- **Reporter**: Antigravity

## Description
In the Admin Panel's Projects view, the cards marked "Review Needed" utilize a very high-saturation red background (`#FF0000` or similar). While intended to draw attention, the intensity of the color can be visually fatiguing and deviates from a "premium" aesthetic.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Admin Panel.
3. Select "Projects" from the sidebar.
4. Locate cards with the "Review Needed" status.

## Expected Behavior
The "Review Needed" state should be indicated using a more balanced, harmonious color palette (e.g., a softer red or a combination of a subtle background and a bold border/accent).

## Environment
- **Browser**: Chrome (via Playwright)
- **Resolution**: 1280x800 (Desktop)
