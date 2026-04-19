# Issue: Bit Shift Input Validation Failure

## Impact
**Medium** - The "Duck Trade" (Bit Shift) interface allows users to enter non-binary digits (e.g., 2, 5, 9) into the bit-weight input fields. This breaks the logical premise of the binary-to-decimal conversion and results in confusing error messages or incorrect "Binary total" calculations.

## Description
In the Duck Trade section, the input fields for bit weights (1b, 2b, 4b, etc.) are meant to represent binary digits (0 or 1). However, the current implementation:
1. Accepts any numeric character.
2. Performs calculations using these non-binary values (e.g., entering '5' in the 2b field might be treated as 5 * 2 = 10 in the decimal sum).
3. Fails to provide immediate visual feedback that only 0 and 1 are valid.

## Reproduction Steps
1. Login and navigate to the Duck Trade page (`/trade` or click the Ducks badge).
2. Locate the bit-weight input fields (1b, 2b, 4b, etc.).
3. Type "5" into the 2b field and "3" into the 4b field.
4. Observe the "Binary total" and validation box showing non-binary or unexpected sums.

## Evidence
- Browser testing confirmed that fields `duck_0` through `duck_6` accept arbitrary numeric input.
- Error message: `1001_2 != 10_10` shows correctly when there is a mismatch, but the "Binary total" is calculated incorrectly if non-binary digits are present.

## Root Cause
The bit weight input fields were implemented as standard `type="number"` inputs with a `max="10"` attribute and logic in `handleDuckCountChange` that allowed values up to 10. This allowed users to enter non-binary digits, which broke the binary-to-decimal conversion logic and provided a confusing user experience.

## Resolution
1.  **Refactored UI Component**: Replaced text input fields for bit weights with interactive `bit-toggle` buttons in `BitShift.jsx`.
2.  **Strict Logical Reinforcement**: Updated the component state management to only allow 0 or 1 for each bit weight, using a toggle function (`handleDuckToggle`) instead of a generic number change handler.
3.  **Enhanced Visual Feedback**: Added CSS styles for the `.bit-toggle` class, including a vibrant gradient and glow effect for the "1" state, making the binary nature of the interface immediately clear and more premium.

## Changed Files
- `frontend/src/pages/General/BitShift.jsx`
- `frontend/src/pages/General/BitShift.css`
