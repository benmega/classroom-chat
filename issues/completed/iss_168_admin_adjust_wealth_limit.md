# Admin: "Adjust Wealth" Shortcut Limited to 10 Users

## Description
The "Adjust Wealth" quick action modal on the dashboard uses the `users` list from the dashboard overview, which is limited to the top 10 most recent/active users. This prevents admins from adjusting the balance of any student who doesn't happen to be in that top 10 list.

## Steps to Reproduce
1. Go to Admin Dashboard.
2. Click "Adjust Wealth" in the Quick Actions sidebar.
3. Open the "Target User" dropdown.
4. Observe that only 10 users are available, regardless of total student count.

## Expected Result
Admins should be able to search for or select any user in the system.

## Actual Result
Only 10 users are selectable.

## Impact
Medium - Forces admins to navigate to the full Users directory instead of using the dashboard shortcut.
