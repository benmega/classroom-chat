# Issue: Broken Swagger Link in Admin Advanced Panel (SPA Fallback)

## Impact
**Medium** - Administrators cannot access the API documentation via the frontend link, hindering development and debugging.

## Description
The "View Swagger" link in the Admin Advanced Panel (`/admin/advanced`) points to `http://localhost:5173/api/docs`. However, instead of loading the Swagger UI, it triggers the React SPA fallback, displaying the main chat interface or a "Page Not Found" equivalent within the app.
- Backend Swagger is accessible directly at `http://localhost:8000/api/docs`.
- The Vite proxy is likely missing the configuration to route `/api/docs` to the backend.

## Reproduction Steps
1. Login as admin (`/dev-login?role=admin`).
2. Navigate to `http://localhost:5173/admin/advanced`.
3. Click the "View Swagger" link.
4. Observe that the browser remains on the frontend port, showing the chat UI instead of Swagger.

## Evidence
- swagger_broken_screenshot (shows chat UI at /api/docs URL)

## Recommendation
1. Update `frontend/vite.config.js` to include `/api/docs` in the proxy settings.
2. Alternatively, update the link in `AdvancedPanel.jsx` to point directly to the backend port (though proxy is preferred for consistency).

## Root Cause
The Vite proxy configuration was missing an explicit entry for `/api/docs`. Due to the React SPA's catch-all route (`*`), requests to `/api/docs` on the frontend port were being intercepted by the frontend router and redirected to the home page instead of being proxied to the backend.

## Resolution
Updated `frontend/vite.config.js` to include an explicit proxy entry for `/api/docs` pointing to `http://localhost:8000`. Verified that navigating to `http://localhost:5173/api/docs` now correctly routes to the backend Swagger UI.

## Changed Files
- `frontend/vite.config.js`
