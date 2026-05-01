# iss_120_bit_shift_binary_reversed_admin
**Status**: Completed
**Priority**: Medium
**Type**: Functional Bug

## Description
In the Bit Shift trade interface, the binary representation shown on the Admin Panel for pending trades was reversed (LSB on the left) and limited to 7 bits. Standard binary notation expects MSB on the left and 8 bits (one byte) representation.

## Requirements
- Reverse the bit order in the "Pending Trades" view on the Admin Panel.
- Ensure 8 bits are displayed (one byte) with the highest value (128) on the far left and the lowest value (1) on the far right.
- Example: 11 ducks should be `00001011`.

## Root Cause
1.  **Backend Form:** `duck_trade_routes.py` had `min_entries=7` and `max_entries=7` for the bit selection forms, limiting input to 7 bits.
2.  **Frontend State:** `BitShift.jsx` initialized state with `Array(7)`, further restricting it to 7 bits.
3.  **Frontend Display:** `PendingTrades.jsx` rendered the `bit_ducks` array directly without reversing it or padding to 8 bits. Since the array stores bits in LSB-first order (index 0 = 2^0), direct rendering showed LSB on the left.

## Resolution
- **Backend:** Updated `duck_trade_routes.py` to support 8-bit forms.
- **Frontend:** 
    - Updated `BitShift.jsx` to handle 8 bits and pad the binary total display.
    - Updated `BitShift.css` to handle 8 columns.
    - Updated `PendingTrades.jsx` with a `formatBits` helper that pads the bit array to 8 bits and reverses it for MSB-first display.

## Changed Files
- `frontend/src/pages/General/BitShift.jsx`
- `frontend/src/pages/General/BitShift.css`
- `backend/application/routes/duck_trade_routes.py`
- `frontend/src/pages/Admin/PendingTrades.jsx`

## Verification Results
- **Confirmed:** Sent 11 ducks as student. Verified 8 toggles available.
- **Confirmed:** Admin panel correctly showed `0 0 0 0 1 0 1 1` for the 11-duck trade.
- **Evidence:** Screenshot captured during verification: `pending_trade_verification_1776603324277.png`
