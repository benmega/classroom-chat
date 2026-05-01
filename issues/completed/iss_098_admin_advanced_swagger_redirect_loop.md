# Admin Advanced Panel: Swagger UI Redirect Loop

## Description
The "View Swagger" button in the Admin Advanced Panel attempts to open `/api/docs`, but instead of showing API documentation, it redirects to the main application interface (causing a loop if opened in a new tab).

## Reproduction Steps
1. Log in as admin.
2. Navigate to Admin -> Advanced.
3. Click "View Swagger".
4. Observe that a new tab opens but displays the main app homepage/login instead of Swagger UI.

## Expected Behavior
The button should open the Swagger/OpenAPI documentation for the backend API.

## Root Cause Analysis
The `/api/docs` route was not registered in the backend. Due to the catch-all route in `general_routes.py` and the Vite proxy configuration, requests to `/api/docs` were being served the React application's `index.html`. Since the React application doesn't have a route for `/api/docs`, it displayed the default shell without content or redirected, creating a perceived loop.

## Resolution
1.  **Dependency Addition**: Added `flask-swagger-ui==4.11.1` to `backend/requirements.txt`.
2.  **Schema Creation**: Created a basic `openapi.json` specification in `frontend/static/swagger.json` covering core authentication, admin, and messaging endpoints.
3.  **Route Registration**: Integrated the `flask-swagger-ui` blueprint in `backend/application/routes/__init__.py`, mapping `/api/docs` to the Swagger UI and pointing it to the static JSON specification.
4.  **Verification**: Confirmed with `browser_subagent` that the "View Swagger" button now correctly opens the interactive documentation.

## Changed Files
- `backend/requirements.txt`
- `backend/application/routes/__init__.py`
- `frontend/static/swagger.json` (New File)

