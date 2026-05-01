# Backend Pagination for Admin User List

## Description
The Admin Dashboard currently fetches the entire user list from the database in a single request. While a "summary" serialization has been implemented to reduce the per-user processing overhead, the system still scales linearly with the number of users. With hundreds or thousands of users, the JSON payload will become prohibitively large, leading to slow response times and high memory usage.

## Technical Details
- **Affected Route:** `/api/admin/users` in `backend/application/routes/admin/user_mgmt.py`
- **Affected Route:** `/api/admin/dashboard` in `backend/application/routes/admin/dashboard_routes.py`
- **Current Behavior:** `User.query.all()` is called, and all users are sent to the frontend.
- **Problem:** No `limit` or `offset` parameters are supported.

## Recommended Solution
1. Modify the `/api/admin/users` endpoint to accept `page` and `per_page` query parameters.
2. Use SQLAlchemy's `.paginate()` or `.limit().offset()` methods.
3. Update the frontend `Users.jsx` and `AdminDashboard.jsx` to support paginated fetching and UI components (e.g., "Next/Previous" buttons or infinite scroll).

## Impact
Medium - Affects scalability as the user base grows.

## Root Cause
The admin user management routes were fetching the entire `User` table using `User.query.all()`. As the student database grew, this linearly increased API response size and frontend rendering time, leading to performance bottlenecks.

## Resolution
1.  **Backend Pagination**: Implemented `flask-sqlalchemy` pagination in `/api/admin/users` supporting `page` and `per_page` parameters.
2.  **Dashboard Optimization**: Limited the dashboard's initial user preview to 10 records and added a total count.
3.  **Frontend Controls**: Added pagination UI (Next/Previous, page indicator) to `Users.jsx` and updated the Dashboard with a direct link to the full Directory.

## Changed Files
- `backend/application/routes/admin/user_mgmt.py`: Added pagination logic to `get_users`.
- `backend/application/routes/admin/dashboard_routes.py`: Limited user list and added `total_users_count`.
- `frontend/src/pages/admin/Users.jsx`: Implemented pagination state and UI.
- `frontend/src/pages/admin/Users.css`: Added styles for pagination controls.
- `frontend/src/pages/admin/AdminDashboard.jsx`: Updated user summary display and added directory links.
- `frontend/src/pages/admin/AdminDashboard.css`: Styled new dashboard elements.
