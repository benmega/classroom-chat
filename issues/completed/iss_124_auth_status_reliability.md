# iss_124_auth_status_reliability
**Status**: Open
**Priority**: Medium
**Type**: Reliability / Backend Bug

## Description
The `/user/api/auth/status` endpoint was reported to return 500 Internal Server Errors during automated desktop UI audits. Although manual verification showed success, the intermittent nature of this error suggests a potential race condition, database connection pooling issue, or an edge case in `to_dict()` when certain user data (like complex contribution data or relationships) is inconsistent.

## Repro Steps (based on audit logs)
1. Run automated browser tests that involve rapid page transitions.
2. Observe 500 errors in the console for `/user/api/auth/status`.

## Requirements
- Investigate the backend logs for the specific traceback of the 500 error.
- Add robust error handling and logging to the `auth_status` route.
- Optimize `User.to_dict()` to avoid expensive calculations (like `get_contribution_data()`) during a simple status check if not needed.
