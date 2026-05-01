# Bug: Profile Stats Truncation

## Description
On the User Profile page, large numerical values in the "Stats" cards (specifically the "Lifetime" stat) are truncated with an ellipsis, preventing the user from seeing their full score.

## Steps to Reproduce
1. Log in.
2. Navigate to the Profile page (@ben or any user with a high score).
3. Observe the "Lifetime" stat card.

## Expected Result
Numerical stats should be fully visible, perhaps using shorthand (e.g., 10B) or by adjusting the font size/card width to accommodate the number.

## Actual Result
The number is truncated (e.g., `10,010,...`).

## Impact
**Medium (Visual/UX).** Scores are a primary feature for users; hiding them degrades the value of the profile page.

## Screenshots
![Profile Stats Truncation](C:\Users\Ben\.gemini\antigravity\brain\45962e20-3f07-4658-83d8-1275bab4fbd0\ben_stats_section_1775706191885.png)
