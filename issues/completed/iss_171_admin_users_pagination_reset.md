# Admin: User Management Pagination Resets on Action

## Description
Performing administrative actions (like Reset Password or Adjust Ducks) in the Users directory causes the view to reset to Page 1, even if the admin was working on a later page.

## Details
The `handleResetPassword` and `handleAdjustDucks` functions in `Users.jsx` call `fetchUsers()` without passing the current `page` state back, causing the API call to default to page 1.

## Steps to Reproduce
1. Go to Admin -> Users.
2. Navigate to Page 3.
3. Reset a user's password.
4. Observe that after the action, you are returned to Page 1.

## Expected Result
The view should stay on the current page after an action is completed.

## Actual Result
The pagination resets to the beginning.

## Impact
Minor - Annoying for administrators managing large numbers of users.
