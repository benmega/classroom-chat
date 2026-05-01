# Issue: API Redirection and HTML Response Regression

## Description
Several backend routes and decorators used by the new React frontend still utilize legacy redirection logic, which returns HTML content instead of appropriate JSON error responses and status codes.

## Implementation Details
1. **Decorators:** The `require_login` decorator in `user_routes.py` and `admin_only` decorator in `admin_required.py` still use `redirect(url_for(...))` or `render_template("index.html")` for unauthorized access if the request doesn't explicitly meet `request.is_json` or matching `Accept` headers.
2. **Frontend Handling:** When the React app receives a 302 Redirect to a login page (HTML), Axios follows it and receives the HTML body. This leads to parsing errors or "stuck loading" states because the frontend code expects JSON with specific status codes (401/403).

## Impact
Degraded user experience and difficulty in debugging authentication failures in the headless architecture. Users may see unexpected behavior instead of being prompted to log in gracefully by the SPA.

## Root Cause
The backend auth decorators (`require_login` and `admin_only`) and the catch-all route were primarily designed for traditional multi-page applications, returning HTML redirects or templates when a user was not authenticated. This caused issues for the headless React frontend, which expected 401/403 JSON responses to handle authentication states gracefully without CSRF or CORS side-effects from redirected HTML pages.

## Resolution
1.  **Backend Decorators:** Updated `require_login` and `admin_only` to check for JSON requests or `Accept: application/json` and return a standard `jsonify({"error": "..."}), 401/403` response.
2.  **Catch-all Route:** Updated the catch-all route in `general_routes.py` to return a 404 JSON error for any path starting with `/api/`, preventing it from serving the React `index.html` for missing API endpoints.
3.  **Frontend Axios Client:** Added a global response interceptor to `frontend/src/api/client.js` that detects 401 errors and automatically redirects the user to `/login` within the SPA.

## Changed Files
- `backend/application/routes/user_routes.py`: Updated `require_login` decorator.
- `backend/application/decorators/admin_required.py`: Updated `admin_only` decorator.
- `backend/application/routes/general_routes.py`: Updated catch-all route.
- `frontend/src/api/client.js`: Added global 401 error handler.

## Evidence
Verified using `curl` with `Accept: application/json` headers, confirming that unauthorized access to `/user/profile` now returns `HTTP 401` with a JSON payload instead of a 302 redirect to HTML. Frontend redirection was also verified by navigating to `/profile` while logged out and observing the immediate redirect to `/login` triggered by the Axios interceptor.
