# Issue: Unauthenticated Admin CRUD Access

## Description
A critical security vulnerability has been identified where the newly implemented Admin CRUD API endpoints lack any authentication or authorization checks.

## Implementation Details
The `admin_crud` blueprint, registered at `/api/admin/crud`, maps directly to SQLAlchemy models and provides GET, POST, PUT, and DELETE access. 

1. **Missing Guards:** No `@admin_only` or `@require_login` decorators are applied to these routes.
2. **Mass Assignment:** The `create` and `update` routes use `request.json` to directly instantiate or update models:
   ```python
   # In create()
   item = model(**params) 
   # In update()
   for key, value in params.items():
       if hasattr(item, key):
           setattr(item, key, value)
   ```
   This allows callers to specify protected fields like `is_admin`, `is_approved`, or even `id`.

**File:** `backend/application/routes/admin/crud_routes.py`

## Impact
Any user (including unauthenticated guests) can view, create, modify, or delete any record in the database. Combined with the mass assignment flaw, any user can create a new account and immediately grant themselves Admin privileges by setting `is_admin: true`. This constitutes a total security failure for the application.


## Root Cause
The `admin_crud` blueprint was implemented without any authentication or authorization decorators, exposing the entire database via a generic CRUD API. Furthermore, the use of `**params` and `setattr` without filtering allowed mass assignment of sensitive database fields.

## Resolution
1. Applied `@admin_only` decorator to all routes in `backend/application/routes/admin/crud_routes.py`.
2. Implemented a `protected` fields filter in `create` and `update` methods to prevent mass assignment of `id`, `password_hash`, and `created_at`.
3. (Incidental) Fixed a redirect loop in `backend/application/routes/general_routes.py` that was discovered during verification.

## Changed Files
- `backend/application/routes/admin/crud_routes.py`
- `backend/application/routes/general_routes.py`

## Evidence
- Fixed API response (401 when unauthenticated): `curl -i -H "Accept: application/json" http://localhost:8000/api/admin/crud/User`
- Verified admin access: [json_response_user_crud_1776767096306.png](file:///c:/Users/Ben/.gemini/antigravity/brain/7d4b877c-66ad-4fd1-8c70-6d88690805fb/json_response_user_crud_1776767096306.png)
