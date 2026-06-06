# BE-3: In-Memory Data Aggregation for Contribution Graph

## Description
In `backend/application/models/user.py`, the `get_contribution_data()` method retrieves every single `ChallengeLog` entry for a user via `logs = self.challenge_logs.all()`. It then iterates through all these logs in memory, runs a datetime parsing function on each, and builds a frequency dictionary manually.

## Impact
- **Performance/Memory Bottleneck:** As users complete hundreds or thousands of challenges, pulling all full table rows into memory and doing loop-based date parsing in Python becomes increasingly slow and resource-heavy.
- **Unnecessary DB Load:** It unnecessarily pulls all columns of the `ChallengeLog` records from the database instead of leveraging the database engine's capabilities.

## Recommendation
Offload the aggregation to the database. Use SQLAlchemy's `db.session.query` with `func.count()` and `func.date(ChallengeLog.timestamp)` (or equivalent for the dialect) combined with `group_by`. This way, the database only returns the aggregated daily counts, making it vastly more efficient.
