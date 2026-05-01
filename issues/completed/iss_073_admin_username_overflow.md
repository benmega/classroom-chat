# Issue: Admin Username Overflow and Overlap

## Description
In the Admin User Directory and the Admin Dashboard Leaderboard, users with very long nicknames or usernames cause the layout to overflow. The text overlaps with other columns (Account Type, Economy) or stretches the card boundaires, breaking the premium aesthetic of the desktop UI.

## Impact
Major - Visual regression that makes the admin panel look unprofessional and hard to read when dealing with long names.

## Reproduce
1. Log in as Admin.
2. Navigate to 'User Directory'.
3. Create or view a user with a long nickname (e.g., 'ThisIsAnExtremelyLongNicknameThatWillOverlap').
4. Observe the 'User Profile' column overlapping the 'Account Type' column.

## Proposed Fix
Implement CSS truncation with ellipsis for `.name`, `.handle`, `.u-name`, and `.u-handle` classes.

## Status
Fixed. Truncation with `max-width: 140px` and `text-overflow: ellipsis` added to `Users.css` and `AdminDashboard.css`.
