# BE-7: Redundant User Database Lookup in Challenge Submission

## Description
In `backend/application/routes/challenge_routes.py`, the `submit_challenge` route fetches the `User` object at the start using `user = get_user(session_userid)`. However, it later passes `user.username` down to `detect_and_handle_challenge_url` -> `_update_user_ducks`, where it executes a redundant database query:
```python
user = User.query.filter_by(username=username).first()
```

## Impact
- **Performance:** This adds an unnecessary round-trip to the database during the critical path of submitting a challenge. 
- **Brittleness:** Re-fetching by a mutable property like `username` is riskier than passing around the original ORM object or its primary key (`user_id`).

## Recommendation
Refactor the function chain (`detect_and_handle_challenge_url`, `_log_challenge`, `_update_user_ducks`) to accept the full `User` object (or the `user_id`) instead of the `username` string, removing the need to re-query the database.

## Resolution
The function chain now accepts the full User object, eliminating the redundant database lookups. Tests were updated and verified passing.
