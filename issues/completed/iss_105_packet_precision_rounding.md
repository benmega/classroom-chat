# Excessive Decimal Precision in Packet Header

## Description
The "Packets" counter in the application header displays values with excessive decimal precision (up to 5 or more decimal places, e.g., `0.17548`). This detracts from the premium aesthetic and could lead to layout crowding as the value grows.

## Steps to Reproduce
1. Navigate to the Dashboard or any page with the header.
2. Observe the "Packets" value in the top right corner.

## Expected Result
The "Packets" value should be rounded to a consistent and readable number of decimal places (e.g., 2 or 3), or use a formatted string (e.g., `0.175`).

## Actual Result
The value is displayed with high precision: `0.17548`.

## Impact
Low - Visual polish issue that affects the "premium feel" of the application.

## Screenshots

## Root Cause
The `toLocaleString` function in `Layout.jsx` was explicitly configured with `maximumFractionDigits: 5`, which caused small fractional packet values to be displayed with high precision. Additionally, the global `formatLargeNumber` utility was rounding all values below 10,000 to zero decimal places, which would cause small fractional values (like packets) to be displayed as `0` in the profile header.

## Resolution
- Updated `Layout.jsx` to use `maximumFractionDigits: 3` for packet displays in both the main header and the mobile dropdown.
- Updated `formatLargeNumber` in `formatters.js` to use `maximumFractionDigits: 3` for numbers below 10,000, ensuring consistent fractional display for packets and ducks across the application.

## Changed Files
- `frontend/src/components/Layout/Layout.jsx`
- `frontend/src/utils/formatters.js`

## Evidence
The "Packets" value now displays as `0.175` instead of `0.17548` in both the header and profile page.
![Header Fix](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/header_packets_verification.png)
![Profile Fix](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/profile_packets_verification.png)

