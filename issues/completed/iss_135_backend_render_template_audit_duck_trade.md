# Issue: Audit and Replace render_template in Duck Trade Routes (iss_135)

## Description
A systematic audit of `backend/application/routes/duck_trade_routes.py` has identified routes that still use `render_template` for server-side rendering. These should be replaced with JSON responses to support the React frontend.

## Routes Identified
| Route | Function | Lines | Template |
|-------|----------|-------|----------|
| `/` (relative to blueprint) | `index()` | 74 | `bit_shift.html` |
| `/bit_shift` | `bit_shift()` | 155 | `bit_shift.html` |

## Proposed Fix
1. These routes serve the "Bit Shift" trading interface. This interface should be migrated to a React component.
2. The routes should be converted to return the initial state/configuration for the trade interface in JSON format.
3. Redirect direct access to the frontend's trade page.

## Files Involved
- `backend/application/routes/duck_trade_routes.py`
