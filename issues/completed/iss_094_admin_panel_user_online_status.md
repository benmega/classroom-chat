# Admin Panel User Online Status Accuracy

## Description
The online/offline status indicator for users in the admin panel is non-functional.

## Symptoms
- Users are showing as "Online" even when they are clearly inactive or logged out.
- The trigger for updating this status is likely broken or too aggressive.

## Recommended Solution
1. Investigate the backend logic that tracks user activity (e.g., heartbeat, last active timestamp).
2. Ensure the "Online" status timeout is calibrated correctly (e.g., 5-10 minutes of inactivity should mark them offline).
3. Verify the frontend updates the status in real-time or upon refresh.

## Root Cause
1. **Broken Backend Query**: The session cleanup task used an invalid SQLAlchemy comparison (`is None` instead of `== None`), causing it to skip all stale sessions.
2. **Missing Status Update**: The cleanup task only updated the `SessionLog` but failed to set the corresponding `User.is_online` status to `False`.
3. **Ghost Statuses**: Users could remain "Online" if they had no active session log (e.g., after a crash), with no logic to clear these "ghost" statuses.
4. **Missing Heartbeat**: The React frontend was missing the heartbeat mechanism that existed in legacy code, leading to premature staleness if user didn't navigate for a while, or never being cleaned up if the tab was closed.

## Resolution
1. **Backend Fix**: Refactored `backend/application/utilities/session_cleanup.py` to:
   - Use correct SQLAlchemy `== None` syntax.
   - Automatically set `User.is_online = False` when a session is closed.
   - Added a "Ghost Cleanup" pass to mark users as offline if they have no active session logs.
2. **Frontend Fix**: Added a heartbeat `useEffect` in `frontend/src/components/Layout/Layout.jsx` that pings `/session/heartbeat` every 30 seconds.
3. **Cleanup Calibration**: Reduced the stale timeout from 30 minutes to 10 minutes for better accuracy.

## Files Changed
- `backend/application/utilities/session_cleanup.py`
- `frontend/src/components/Layout/Layout.jsx`

## Verification
- Manually ran cleanup script which successfully cleared 29 stale and 9 ghost sessions.
- Verified that online status is correctly reset to `False` for inactive users.
