# Issue: Admin API NameError 'today' is not defined

## Description
The `/api/admin/users` endpoint periodically fails with a `NameError: name 'today' is not defined` when generating the contribution data for users. This causes the entire User Directory to fail to load in the admin panel, showing an infinite loading state.

## Impact
Critical - Prevents administrators from managing users and viewing the directory.

## Reproduce
1. Log in as Admin.
2. Navigate to 'User Directory'.
3. Observe infinite loading state.
4. Check browser console or backend logs for 500 status on `/api/admin/users`.

## Investigation
The error occurs in `User.get_contribution_data()` (line 235 of `user.py`). 
Code: `idx = (today.weekday() + 1) % 7`
In the reported version, `today` was used without being defined earlier in the method. 

## Status
Resolved. Verified that `today = date.today()` is present on line 234 of `backend/application/models/user.py`.

## Root Cause
The `get_contribution_data` method was referencing the `today` variable on line 235 without it being defined in the local or global scope. This caused a `NameError` which interrupted the serialization of user data for the Admin User Directory.

## Verification
- **Automated Check**: Logged in as Admin 'ben' and navigated to the User Directory (`/admin/users`).
- **Result**: The user list (97 users) loaded successfully without errors. Browser console and backend logs showed no 500 errors for `/api/admin/users`.
- **Code Inspection**: Confirmed `today = date.today()` is correctly defined at the start of `get_contribution_data`.

## Changed Files
- `backend/application/models/user.py` (Fixed in previous iteration, verified in this one)
