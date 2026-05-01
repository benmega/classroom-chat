# Issue: Audit and Replace render_template in Admin and General Routes (iss_138)

## Description
A systematic audit of `backend/application/routes/admin_advanced_routes.py` and `general_routes.py` has identified the use of server-side template rendering for the catch-all route and the advanced admin panel.

## Routes Identified
| Route | Function/Class | Lines | Template |
|-------|----------------|-------|----------|
| `/<path:path>` | `general.index()` | 19 | `index.html` |
| `/api/admin/advanced/` | `AdvancedIndex.index()` | 60 | `admin/advanced_panel.html` |

## Proposed Fix
1. For global `index.html` serving: In a development environment with a separate frontend server (Vite/React), this route could redirect to `http://localhost:3000` or serve a simple JSON redirect. In production, serving the built `index.html` is standard, but the `render_template` call should be reviewed.
2. For the Advanced Admin Panel: The "Advanced Panel" is currently a `flask-admin` implementation. To fully move away from Jinja2, this would require either a React-based implementation of the dynamic model management or ensuring the `flask-admin` templates are isolated and not conflicting with SPA goals. Given earlier issues (iss_129), there is a desire to clean up legacy Jinja2 entirely.

## Files Involved
- `backend/application/routes/admin_advanced_routes.py`
- `backend/application/routes/general_routes.py`
