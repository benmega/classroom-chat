# ISSUE-004: Invisible Input Fields on Bit Shift Page

## Status: Open
## Priority: High
## Category: UI / UX

### Description
On the `/bit-shift` page, the denomination input fields (where users likely enter values) have no borders, background, or placeholder visibility. They are completely invisible against the white page background until the user happens to click on the correct spot.

### Steps to Reproduce
1. Log in.
2. Navigate to the "Bit Shift" or "Ducks" trading page.
3. Look for input fields to enter amounts.

### Expected Behavior
Input fields should have consistent styling (borders, subtle background, or shadow) to indicate they are interactive elements.

### Actual Behavior
Inputs are "phantom" elements that only reveal themselves on focus.
