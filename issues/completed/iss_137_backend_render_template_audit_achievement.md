# Issue: Audit and Replace render_template in Achievement Routes (iss_137)

## Description
A systematic audit of `backend/application/routes/achievement_routes.py` has identified multiple routes using legacy `render_template` calls. These include user-facing achievement pages and admin-only achievement management.

## Routes Identified
| Route | Function | Lines | Template |
|-------|----------|-------|----------|
| `/view` | `achievements_page()` | 90 | `achievements.html` |
| `/add` | `add_achievement()` | 118, 126, 146 | `admin/add_achievement.html` |
| `/submit_certificate` | `submit_certificate()` | 172, 182, 191, 200, 234, 240 | `submit_certificate.html` |

## Proposed Fix
1. For `/view`, ensure the React frontend handles the achievements display using the existing `/all` API endpoint.
2. For `/add`, migrate the form to a React-based admin dashboard component.
3. For `/submit_certificate`, migrate the file upload form to a React component and convert the backend to return JSON status.

## Files Involved
- `backend/application/routes/achievement_routes.py`
