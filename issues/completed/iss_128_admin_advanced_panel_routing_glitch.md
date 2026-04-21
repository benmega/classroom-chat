# Issue: Advanced Admin Panel Routing Glitch (iss_128)

## Description
The "Advanced Admin Panel" clickable header in the legacy Flask-Admin templates (rendered via Jinja2) incorrectly routes to the backend URL (`http://localhost:8000/api/admin/advanced/`) instead of the frontend React application URL (`http://localhost:5173/admin/advanced`). This causes the user to leave the SPA environment.

## Symptoms
- When navigating to a specific model view in the Advanced Panel (e.g., `http://localhost:8000/api/admin/advanced/adv_User/`), clicking the "Admin Dashboard" or "Advanced Panel" links in the header/dropdown takes the user back to a backend-rendered page on port 8000.
- The UI transitions from the modern React design to a legacy Bootstrap-based Jinja2 design.

## Root Cause
- The file `frontend/templates/admin/admin_base.html` contains hardcoded `href` attributes pointing to backend routes like `/admin` and `/api/admin/advanced`.
- `frontend/src/pages/Admin/AdvancedPanel.jsx` links to the Flask-Admin interface using direct `href` tags to the backend API, instead of staying within the React router context or using a proxy that redirects back to the frontend.

## Proposed Fix
1. Update `frontend/templates/admin/admin_base.html` to point links back to the frontend origin (e.g., `http://localhost:5173/admin`).
2. Update `AdvancedPanel.jsx` to handle transitions more gracefully, or ideally, replace the Flask-Admin dependency with a React-based model manager.
3. Remove or migrate legacy Jinja2 templates in `frontend/templates/` to React components as part of the ongoing "Jinja2 removal" effort.

## Files Involved
- `frontend/templates/admin/admin_base.html`
- `frontend/src/pages/Admin/AdvancedPanel.jsx`
- `backend/application/routes/admin_advanced_routes.py`
