# Admin Duck Adjustment API Failure

## Description
When an administrator attempts to adjust a user's duck balance (e.g., for `blossomstudent01`), the API call to `/api/admin/adjust_ducks` returns a 400 Bad Request error. This is because the frontend sends the truncated username (e.g., `blossoms`) in the payload, which the backend fails to recognize as a valid user.

## Steps to Reproduce
1. Log in as admin (`ben`).
2. Navigate to the Admin HQ -> User Directory.
3. Find a user with a long username (e.g., `blossomstudent01`).
4. Click "Adjust Balance".
5. Enter an amount (e.g., 5) and click "Apply Adjustment".
6. Observe the network tab or console for a 400 Bad Request response.

## Expected Result
The API should receive the full username (e.g., `blossomstudent01`) and correctly adjust the user's duck balance, returning a 200 OK success.

## Actual Result
The API receives a truncated username (e.g., `blossoms`) and returns a 400 Bad Request if the user does not exist or if validation fails.

## Impact
Major - This completely breaks the primary admin function of managing user student balances for users with usernames longer than 8-10 characters.

## Screenshots
![API Failure](C:\Users\Ben\.gemini\antigravity\brain\12d5c304-1ced-4652-bf3a-a28a51772d7d\.system_generated\click_feedback\click_feedback_1775895522577.png)
