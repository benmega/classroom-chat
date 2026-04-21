# Issue: Legacy Jinja2 Templates Cleanup (iss_129)

## Description
Despite the project goal of migrating to a React-based SPA, numerous legacy Jinja2 templates remain in the `frontend/templates/` directory and are still being utilized by the Flask backend. The user was under the impression that Jinja2 rendering had been removed.

## Symptoms
- Routes like `/login`, `/signup`, `/profile`, and `/chat` may still be rendering server-side templates if hit directly or if the frontend router fails.
- Inconsistent UI/UX between the modern React components and legacy Bootstrap-based templates.
- Backend configuration `TEMPLATE_FOLDER` is still pointing to `frontend/templates`.

## Root Cause
- The migration to React is incomplete.
- Backend routes in `application/routes/` still use `render_template()` instead of returning JSON for React to consume, or they are serving templates that haven't been replaced by React equivalents.

## Findings
The following areas still depend on Jinja2 templates:
- **Auth**: `login.html`, `signup.html`
- **Admin**: `admin_base.html`, `advanced_panel.html`, Flask-Admin interface.
- **User**: `profile.html`, `edit_profile.html`, `manage_project.html`.
- **Chat**: `view_conversation.html`, `conversation_history.html`.
- **Other**: `bit_shift.html`, `submit_certificate.html`, `submit_challenge.html`.

## Proposed Fix
1. Systematically audit all backend routes and replace `render_template()` calls with either API responses (if for React) or ensure the React router handle the path.
2. Complete the migration of the "Advanced Panel" to a React component that manages the database models via a REST API.
3. Remove the `frontend/templates/` directory once all functionality is successfully migrated.
4. Update `application/__init__.py` to remove `template_folder` logic once obsolete.

## Files Involved
- `backend/application/routes/*.py`
- `frontend/templates/**/*.html`
- `backend/application/config.py`
