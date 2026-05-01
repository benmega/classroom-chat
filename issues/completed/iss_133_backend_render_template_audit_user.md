# Issue: Audit and Replace render_template in User Routes (iss_133)

## Description
A systematic audit of `backend/application/routes/user_routes.py` has identified several routes that still use `render_template` for server-side rendering. For a headless backend supporting a React SPA, these should be replaced with JSON responses or redirects to the appropriate frontend routes.

## Routes Identified
| Route | Function | Lines | Template |
|-------|----------|-------|----------|
| `/login` | `login()` | 125 | `auth/login.html` |
| `/profile` | `profile()` | 204 | `user/profile.html` |
| `/profile/<slug>` | `view_user_profile()` | 223 | `user/profile.html` |
| `/edit_profile` | `edit_profile()` | 259 | `user/edit_profile.html` |
| `/project/new` | `new_project()` | 320 | `user/manage_project.html` |
| `/project/edit/<int:project_id>` | `edit_project()` | 382 | `user/manage_project.html` |

## Proposed Fix
1. For GET requests that serve forms or data, ensure they return a JSON response containing the necessary data for React to render.
2. For routes that act as entry points, redirect to the frontend URL (e.g., `http://localhost:3000/profile`) instead of rendering a template.
3. Remove redundant HTML rendering logic once the frontend has been verified to handle these paths.

## Files Involved
- `backend/application/routes/user_routes.py`
