# ISSUE-011: Signup Feature Disabled

## Status: Open
## Priority: High
## Category: Functional / Auth

### Description
The `/signup` route on the backend is hardcoded to return a 403 Forbidden with the message "Account registration is currently disabled." Furthermore, the login page lacks a link to a registration page.

### Steps to Reproduce
1. Go to the login page.
2. Observe no "Sign up" or "Register" link.
3. Manually navigate to `/signup`.

### Expected Behavior
A functional registration page should be available to allow new users to join the platform.

### Actual Behavior
The feature is disabled at the route level.
