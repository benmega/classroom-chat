# ISSUE-012: Login Stuck on Failure

## Status: Open
## Priority: Medium
## Category: UI / Auth

### Description
When a login attempt fails (e.g., wrong password), the login button remains in the "Logging in..." state (disabled) and never reverts to its original "Login" state. This forces the user to refresh the page to try again.

### Steps to Reproduce
1. Go to the login page.
2. Enter incorrect credentials.
3. Click "Login".
4. Observe the button state after the error toast appears.

### Expected Behavior
After a failed login, the button should revert to its enabled state to allow the user to correct their credentials.

### Actual Behavior
The `isLoading` state remains `true` or the button never re-enables.
