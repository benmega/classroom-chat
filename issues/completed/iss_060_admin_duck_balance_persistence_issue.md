# Admin Duck Balance Persistence Issue

## Description
When an administrator successfully adjusts a duck balance (e.g., for a short name like `ben`), the frontend briefly updates the balance in the UI. However, upon navigating away and returning, or refreshing the page, the balance reverts to its original value, indicating that the adjustment was not persisted in the database.

## Steps to Reproduce
1. Log in as admin (`ben`).
2. Navigate to Admin HQ -> User Directory.
3. Find a user with a short name (e.g., `ben`).
4. Click "Adjust Balance" and add 5 ducks.
5. Observe the UI updating to the new value (e.g., 55).
6. Navigate to another page (e.g., Analytics) and return to User Directory.
7. Observe the duck count has reverted to the original value (e.g., 50).

## Expected Result
Successful duck adjustments should be permanently persisted in the backend database.

## Actual Result
The duck adjustments appear to be session-only or UI-only, as they revert to the source value after a page transition or refresh.

## Impact
Major - This renders duck management ineffective, as changes made by administrators do not persist and therefore do not provide any lasting benefit or penalty to students.

## Screenshots
![Persistence Failure](C:\Users\Ben\.gemini\antigravity\brain\12d5c304-1ced-4652-bf3a-a28a51772d7d\student_dashboard_ducks_1775896008153.png)
