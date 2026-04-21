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

## Recommendation
1. Update the `Input` components in the Bit Shift page to restrict values to `0` and `1`.
3. Add a pattern validator or `max="1"` attribute to the HTML inputs.
