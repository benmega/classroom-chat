# Issue: Achievements Page Data Inconsistency and Inflated Stats (RESOLVED)

## Impact
**Major** - Users logic for achievements and mastery was decoupled from actual requirements due to a legacy bug and database poisoning.

## Description
The Achievements page (`/achievements`) displayed several data inconsistencies:
1. **Inflated Mastery**: Mastery levels were inflated due to "poisoned" achievement records in the database.
2. **Incorrect Badge Status**: Badges like "First Message" and "Session" badges were marked as Earned despite requirements not being met.
3. **Progress Bar Mismatch**: Users reported seeing "Earned" status while progress seemed low (though the previous UI didn't even show progress).

## Root Cause Analysis
1. **Database Poisoning**: A legacy bug in `longest_session_minutes` was missing a `user_id` filter, causing session achievements to be granted to ALL users if ANY user met the requirement. These records persisted in the database even after the bug was fixed.
2. **Case Sensitivity**: Comparisons for `username` in the achievement engine were case-sensitive (`==`), while the `User` model uses lowercase. This caused some valid progress (like from `ChallengeLog` with mixed-case usernames) to be ignored.
3. **UX Confusion**: The "Course Progress" on the Profile page (e.g. 87% for `ben`) was easily confused with "Achievement Mastery" (57% for `ben`).

## Resolution
1. **Database Cleanup**: Executed a comprehensive audit and cleanup script (`cleanup_poisoned_achievements.py`) that removed 46 inconsistent achievement records from the database.
2. **Backend Logic Fix**:
    - Updated `achievement_engine.py` to use `func.lower()` for all user/helper name comparisons.
    - Added `get_achievement_progress` to the engine to provide raw progress data to the frontend.
3. **Frontend UX Improvement**:
    - Achievements are now automatically re-evaluated when the user visits the Achievements page.
    - Each achievement card now displays a small progress bar and text (e.g. `8 / 10`) for locked badges, providing transparency and preventing confusion.
4. **Mastery calculation**: Verified that Mastery is correctly calculated as `(earned_count / total_possible) * 100`.

## Verification Results
- **Admin Audit**: Ran `audit_achievements.py` across all 108 users. **0 inconsistencies found**.
- **Manual Verification**: Logged in as `tester101` and verified 0% mastery and 0 badges. Logged in as `ben` and verified 57% mastery with 36/63 badges.

## Artifacts
- [cleanup_poisoned_achievements.py](file:///c:/Users/Ben/AntiGravity/classroom-chat/backend/scratch/cleanup_%20poisoned_achievements.py)
- [audit_achievements.py](file:///c:/Users/Ben/AntiGravity/classroom-chat/backend/scratch/audit_achievements.py)
- [Achievements.jsx](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/General/Achievements.jsx)
