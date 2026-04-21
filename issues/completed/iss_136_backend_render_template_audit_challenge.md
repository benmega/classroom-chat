# Issue: Audit and Replace render_template in Challenge Routes (iss_136)

## Description
A systematic audit of `backend/application/routes/challenge_routes.py` has identified the challenge submission route as a user of `render_template`. This should be modernized to return JSON or redirect to a React component.

## Routes Identified
| Route | Function | Lines | Template |
|-------|----------|-------|----------|
| `/challenge/submit` | `submit_challenge()` | 60, 77, 111, 126 | `submit_challenge.html` |

## Proposed Fix
1. Update `submit_challenge` to return JSON for all response paths (success/failure/get).
2. The route already has some `@cross_origin` and JSON detection logic, but it fallbacks to `render_template`. Remove the fallback.

## Files Involved
- `backend/application/routes/challenge_routes.py`
