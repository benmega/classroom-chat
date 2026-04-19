# Missing DuckTransaction Model Definition

## Description
The refactored admin dashboard routes (`backend/application/routes/admin/dashboard_routes.py`) import and attempt to use a `DuckTransaction` model from `application.models.duck_transaction`. However, this file and model do not exist in the current codebase.

## Technical Details
- **Broken Import:** `from application.models.duck_transaction import DuckTransaction` (line 9 of `dashboard_routes.py`).
- **Symptoms:** The Admin Dashboard will fail with an `ImportError` or `ModuleNotFoundError` as soon as it is accessed, likely causing the 500 errors or infinite loading screens reported by users.
- **Root Cause:** A previous refactoring effort appears to have introduced dependency on a model that was never committed or was deleted.

## Recommended Solution
1. Identify if `DuckTransaction` was intended to be a new model for a centralized ledger.
2. If so, create the model file `backend/application/models/duck_transaction.py` with appropriate fields (`id`, `user_id`, `amount`, `type`, `description`, `timestamp`).
3. If not, revert the dashboard logic to use `ChallengeLog` and `DuckTradeLog` or the appropriate existing models.

## Impact
Critical - This is a literal "breaking change" that prevents the Admin Dashboard from functioning at all.
