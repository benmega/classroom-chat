# Admin Duck Adjustment Username Truncation

## Description
In the Admin Dashboard's User Directory, when an administrator clicks "Adjust Balance" for a user with a long username (e.g., `blossomstudent01`), the username is truncated in the modal's Target User field (e.g., to `blossoms`).

## Steps to Reproduce
1. Log in as admin (`ben`).
2. Navigate to the Admin HQ -> User Directory.
3. Find a user with a long username (e.g., `blossomstudent01`).
4. Click the "Adjust Balance" button.
5. Observe the "Target User" field in the modal.

## Expected Result
The full, untruncated username should be displayed (e.g., `blossomstudent01`).

## Actual Result
The username is truncated to approximately 8-10 characters (e.g., `blossoms`), followed by CSS truncation or just a cut-off string.

## Impact
Major - This prevents administrators from identifying the correct user they are about to modify and contributes to API failures if the truncated name is sent to the backend.

## Screenshots
![Username Truncation](C:\Users\Ben\.gemini\antigravity\brain\12d5c304-1ced-4652-bf3a-a28a51772d7d\.system_generated\click_feedback\click_feedback_1775895480780.png)
