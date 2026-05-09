# Bit Shift Toggle Overlaps Header

## Description
In mobile view, the "bit/Byte" toggle switch on the Bit Shift page overlaps with the "Bit Shift" header text, making it look broken and unpolished.

## Steps to Reproduce
1. Authenticate and open the application.
2. Resize the viewport to a mobile width (e.g., 390px).
3. Navigate to the Bit Shift page using the sidebar.
4. Observe the header area.

## Expected Result
The header text and the toggle switch should be vertically stacked or properly spaced to prevent any overlap.

## Actual Result
The toggle switch overlaps directly onto the "Bit Shift" header text.

## Impact
Medium - UI Polish/Readability. It doesn't break functionality but looks unprofessional.

## Screenshots
![Bit Shift Overlap](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_bitshift_overlap.png)

## Root Cause
The absolute positioning of the toggle switch caused it to overlap the header text on certain viewport sizes before the 500px media query triggered. This was resolved by extending the static positioning and stacking to the 768px media query.
## Changed Files
- frontend/src/pages/General/BitShift.css
