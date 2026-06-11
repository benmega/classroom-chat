# BE-6: N+1 Query Issue and OOM Risk in CSV Export

## Description
In `backend/application/routes/admin/dashboard_routes.py`, the `/export/transactions` route contains a classic N+1 query vulnerability and a memory bloat issue:
```python
transactions = DuckTransaction.query.order_by(DuckTransaction.timestamp.desc()).all()
...
for tx in transactions:
    writer.writerow([..., tx.user.username if tx.user else "System", ...])
```

## Impact
- **N+1 Query:** Because `DuckTransaction.user` is defined with `lazy=True`, accessing `tx.user.username` triggers a new `SELECT` query to the `users` table for *every single transaction*. Exporting 10,000 transactions will execute 10,001 queries.
- **Memory/OOM Risk:** `.all()` fetches the entire transaction table into memory before the generator starts streaming the CSV. If the database grows to millions of transactions, the server will crash from Out of Memory (OOM) errors.

## Recommendation
1. Use `joinedload(DuckTransaction.user)` or `selectinload` when querying to fetch users in a single additional query, solving the N+1 problem.
2. Use `.yield_per(100)` or `.stream()` instead of `.all()` to batch or stream the rows from the database, preventing memory exhaustion.

## Root Cause & Resolution
- **Root Cause**: The transactions query used `.all()` to load all records into memory at once, and accessed `tx.user` without eager loading, triggering an N+1 issue. Furthermore, streaming DB queries in Flask required managing context lifecycle correctly.
- **Resolution**: Updated `export_transactions` in `backend/application/routes/admin/dashboard_routes.py` to use `joinedload(DuckTransaction.user)` along with `.yield_per(100)` inside the generator. Applied Flask's `stream_with_context` so the generator can yield correctly while keeping the application context and db session active.
