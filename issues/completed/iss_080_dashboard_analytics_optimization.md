# Dashboard Analytics Query Optimization

## Description
The Admin Dashboard chart (Duck Transactions) is currently generated using a loop that performs multiple database queries for each day in a 7-day window. This results in 14-21 separate queries every time the dashboard is loaded.

## Technical Details
- **Affected File:** `backend/application/routes/admin/dashboard_routes.py`
- **Current Logic:** 
  ```python
  for i in range(6, -1, -1):
      day = ...
      e = db.session.query(...).filter(..., func.date(DuckTransaction.timestamp) == day)...
      s = db.session.query(...).filter(..., func.date(DuckTransaction.timestamp) == day)...
  ```
- **Problem:** N+1 query pattern for time-series data. This is inefficient and slow as the transaction volume increases.

## Recommended Solution
Refactor the logic to use a single aggregation query with `GROUP BY` on the date:
```python
results = db.session.query(
    func.date(DuckTransaction.timestamp).label('date'),
    func.sum(case((DuckTransaction.amount > 0, DuckTransaction.amount), else_=0)).label('earned'),
    func.sum(case((DuckTransaction.amount < 0, DuckTransaction.amount), else_=0)).label('spent')
).filter(DuckTransaction.timestamp >= last_week).group_by('date').all()
```
Then fill in the gaps for any missing days in Python.

## Impact
Medium - Improvements to dashboard responsiveness, especially for busy environments.

## Solution and Root Cause
**Root Cause:** The query pattern for retrieving the 7-day transaction history previously leveraged a loop over a 7-day period, executing up to 3 queries per day. This generated an N+1 query problem, severely inflating the volume of database queries on the dashboard load.
**Resolution:** The logic was refactored to perform a single aggregation query grouped by date using `func.sum()` and `case()`. A python dictionary maps the resulting statistics by date, gracefully filling missing dates implicitly without added queries, matching the exact proposal.

## Changed Files
- `backend/application/routes/admin/dashboard_routes.py`
