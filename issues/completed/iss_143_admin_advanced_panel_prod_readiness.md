# Issue: Admin Advanced Panel Production Readiness & Headless Compliance (iss_143)

## Description
The "Advanced Panel" in the Admin section currently relies on several non-headless and non-production-ready patterns that will cause it to fail in a real production environment and violates the project's goal of a fully headless architecture.

## Symptoms
- **Hardcoded URLs**: Links to model views and Swagger documentation in `AdvancedPanel.jsx` are hardcoded to `http://localhost:8000`. These links will be broken in production.
- **Template Errors in Prod**: The `ProductionConfig` in `backend/application/config.py` sets the `TEMPLATE_FOLDER` to `frontend/dist`. Since Flask-Admin and its custom templates (e.g., `advanced_panel.html`) are not part of the React build process, the backend will fail to find these templates in production, resulting in 500 errors.
- **SPA Breakage**: Clicking links within the Flask-Admin interface can redirect users away from the React SPA and into legacy backend routes.

## Root Cause
- `AdvancedPanel.jsx` uses hardcoded strings for backend links.
- The transition to headless architecture is incomplete for the "Advanced" database management tools.
- Backend configuration for production assumes all templates are in the `dist` folder, which is true for the SPA but false for the legacy Jinja2-based admin tool.

## Proposed Fix
1. **Immediate (Partial Fix)**: Update `AdvancedPanel.jsx` to use dynamic API URLs instead of hardcoded `localhost:8000`.
2. **Architecture**: Migrate the database model management from `Flask-Admin` (server-side rendering) to a React-based CRUD interface that consumes JSON from the backend.
3. **Cleanup**: Remove `Flask-Admin`, all `render_template` calls in `admin_advanced_routes.py`, and the `frontend/templates/` directory.

## Files Involved
- `frontend/src/pages/Admin/AdvancedPanel.jsx`
- `backend/application/routes/admin_advanced_routes.py`
- `backend/application/config.py`
- `frontend/templates/admin/`
