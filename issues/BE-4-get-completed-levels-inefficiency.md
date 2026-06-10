# BE-4: Inefficient Data Retrieval in `get_completed_levels`

## Description
In `backend/application/models/user.py`, the `get_completed_levels()` method reads:
```python
def get_completed_levels(self):
    return {getattr(log, "challenge_slug", "") for log in self.challenge_logs}
```
Because `self.challenge_logs` is a dynamic relationship, iterating over it executes a `SELECT *` query that fetches all columns for every `ChallengeLog` belonging to the user. The application then throws away all columns except `challenge_slug`.

## Impact
- **Performance:** For active users, this query fetches a huge amount of unneeded data, which takes longer over the network and consumes excessive Python memory to instantiate hundreds of ORM objects that are immediately discarded.

## Recommendation
Query only the specific column needed using `with_entities`:
```python
def get_completed_levels(self):
    slugs = self.challenge_logs.with_entities(ChallengeLog.challenge_slug).all()
    return {slug[0] for slug in slugs}
```
