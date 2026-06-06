# BE-5: Unoptimized "Select All" Queries Fetching Unneeded Columns

## Description
Across multiple routes, the application uses `User.query.all()` when only a small subset of the `User` table columns are actually required. 

Examples:
- In `backend/application/routes/user_routes.py` (`get_users_simple_list`): 
  ```python
  users = User.query.all()
  users_data = [{"id": u.id, "username": u.username} for u in users]
  ```
- In `backend/application/routes/admin/dashboard_routes.py` (`dashboard_data`):
  ```python
  all_users = User.query.all()
  ...
  "all_users": [{"id": u.id, "username": u.username, "duck_balance": u.duck_balance} for u in all_users]
  ```

## Impact
- **Performance:** `User.query.all()` retrieves every single column (including large `bio` fields or complex relationships if joinedload is active by default) and instantiates ORM objects for every row in the database. This scales extremely poorly as the user base grows.

## Recommendation
Use `with_entities()` to fetch only the specific columns needed. This skips full ORM object instantiation and only fetches necessary data over the wire.
Example:
```python
users = User.query.with_entities(User.id, User.username, User.duck_balance).all()
```
