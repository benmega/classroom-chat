# Bug: Profile Stats Cards Layout Breakage (Mobile)

## Description
Stats cards on the user profile page (Ducks, Levels, Projects, etc.) are arranged in a fixed horizontal row that does not wrap on small screens. This causes cards to be cut off at the edge of the viewport on mobile devices.

## Steps to Reproduce
1. Log in.
2. Navigate to `/profile`.
3. Resize to 500px width.
4. Observe the stats badges below the banner.

## Expected Result
Stats cards should wrap to a single or double column layout on mobile.

## Actual Result
Cards remain in a row and overflow the screen.

## Impact
**Minor/Major.** Critical user stats are inaccessible on mobile.

## Screenshots
![Profile Overflow](C:\Users\Ben\.gemini\antigravity\brain\19dba842-3e02-4ebc-adb6-49c9486e16ba\mobile_profile_page_1775552337338.png)
