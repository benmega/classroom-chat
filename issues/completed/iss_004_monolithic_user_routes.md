# ISSUE-004: Monolithic Routing and Mixing of Concerns in `user_routes.py`

## Description
The `user_routes.py` file has grown to over 700 lines and currently handles a wide variety of unrelated responsibilities. This makes the codebase harder to maintain, test, and navigate.

## Current Responsibilities in `user_routes.py`:
- User Authentication (Login, Signup, Logout, Status)
- Profile Management (View, Edit, Profile Picture)
- Project Management (CRUD, Image/Video uploads)
- S3 Integration (Video uploads)
- Static File Serving (Profile and Project images)

## Impact
- **Poor Maintainability:** Difficult to find specific logic or refactor one part without affecting others.
- **Testing Complexity:** Unit tests for simple user logic require mocking S3 and file system dependencies.
- **Tight Coupling:** Auth logic is intertwined with project management.

## Proposed Solution
- Extract **Authentication** into `auth_routes.py`.
- Extract **Project Management** into `project_routes.py`.
- Move **File Upload Logic** to a dedicated service or utility module.
- Move **Static File Serving** to a dedicated file serving route or use a middleware/web server.

## Related Files
- `backend/application/routes/user_routes.py`
- `backend/application/routes/__init__.py`
