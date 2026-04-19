# Issue: Bit Shift Validation State Sync Lag

## Impact
**Low** - The red validation box that compares binary totals to decimal amounts sometimes fails to update in real-time when inputs are changed quickly or via certain interaction methods, leading to a temporary UI/state mismatch.

## Description
When interacting with the Duck Trade page, the central validation message (e.g., "Mismatched: 1010_2 != 10_10") occasionally lags behind the actual values in the input fields. This is particularly noticeable after a series of rapid updates or when "Submit Exchange" is clicked while the local state is still refreshing. It forces users to re-type or click out of fields to trigger a re-render/re-validation.

## Reproduction Steps
1. Navigate to the Duck Trade page.
2. Enter values into the bit fields (1b, 2b, 4b...).
3. Rapidly change a '1' to a '0' and immediately observe the validation summary box.
4. Notice that for a brief period (or until blur), the summary still reflects the old binary total.

## Evidence
- During automated testing, the validation box showed `1001_2` even after the inputs were updated to represent `1010_2`.
- A click outside the input field or a delay was required for the state to catch up.

## Root Cause
The "Bit Shift State Lag" was primarily caused by:
1. **Stale State in Handlers**: Bit toggle handlers used current state snapshots instead of functional updates. During rapid clicks, state updates were batched or raced, causing some updates to be overwritten by stale data.
2. **Imprecise UI Logic**: The validation banner was hidden on every input change, preventing "live" feedback. When it did reappear, race conditions occasionally showed old values.
3. **Derived State Synchronization**: Derived values were calculated implicitly during render, which is usually fine, but lacked explicit memoization to guarantee consistency during high-frequency updates.

## Changed Files
- `frontend/src/pages/General/BitShift.jsx`: Switched to functional state updates, added `useMemo` for derived math checks, and enabled real-time "sticky" validation feedback.

## Verification
- Verified with `browser_subagent` that validation updates are now instantaneous and "live" as bits are toggled.
- Confirmed no lint errors were introduced.
- Screenshot of fix: `C:\Users\Ben\.gemini\antigravity\brain\1c8a92f0-bef5-4a39-aaff-cf96c4f22fca\artifacts\bit_shift_fix_verification.png` (Note: Reference only, actual path may vary by session)
