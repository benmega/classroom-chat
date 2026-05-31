# BE-2: Database Normalization and Data Loss Risk with `username` Foreign Keys

## Description
In `backend/application/models/challenge_log.py` and `backend/application/models/duck_trade.py`, the application uses the `username` field as a pseudo-foreign key (and actual foreign key in `duck_trade.py`) to link records to the `User` model, instead of using an immutable surrogate key like `user_id`.

## Impact
- **Data Loss/Orphaning:** When an admin changes a user's username via the `/set_username` endpoint in `backend/application/routes/admin/user_mgmt.py`, the `ChallengeLog` records are completely orphaned because their `username` field is not updated. The user immediately loses all their course progress.
- **Integrity Errors:** For `DuckTradeLog`, since there is a foreign key constraint without `ON UPDATE CASCADE`, attempting to change a username might crash the application with an `IntegrityError` (depending on the database backend).

## Recommendation
- Refactor the `ChallengeLog` and `DuckTradeLog` models to use `user_id` as the foreign key instead of `username`.
- Create database migrations to populate `user_id` on existing logs and drop the `username` column from those tables.
