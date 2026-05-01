# Bug: Bit Shift Cards Horizontal Overflow (Mobile)

## Description
On the `/bit-shift` page at mobile widths, the cards representing different trade denominations (10000b, 100000b, etc.) do not wrap and instead cause horizontal overflow. This makes the higher denominations inaccessible without horizontal scrolling (or completely cut off).

## Steps to Reproduce
1. Log in.
2. Navigate to `/bit-shift`.
3. Resize the window to 500px.
4. Scroll down to the exchange denominations.

## Expected Result
Cards should wrap to multiple rows or use a responsive grid to fit the screen width.

## Actual Result
Cards overflow horizontally.

## Impact
**Major.** Critical trade functionality is difficult to use on mobile.

## Screenshots
![Bit Shift Overflow](C:\Users\Ben\.gemini\antigravity\brain\19dba842-3e02-4ebc-adb6-49c9486e16ba\mobile_bit_shift_page_1775552318255.png)
