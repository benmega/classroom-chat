# Issue: Broken CSRF Protection in Production Environment

## Description
The application will fail in the Production environment for all state-changing operations (Login, Signup, Admin actions, Profile updates) due to a mismatch between backend CSRF requirements and frontend API client configuration.

## Implementation Details
1. **Backend:** Global CSRF protection is enabled via `csrf.init_app(app)` in `application/__init__.py`.
2. **Configuration:** CSRF is disabled in `DevelopmentConfig` (`WTF_CSRF_ENABLED = False`) but defaults to `True` in `ProductionConfig`.
3. **Frontend:** The Axios client in `frontend/src/api/client.js` does not include logic to retrieve the CSRF token from cookies/meta tags or send the `X-CSRFToken` header.

## Impact
While the app works in development (where CSRF is disabled), it will return `400 Bad Request` for all POST/PUT/DELETE requests in Production, rendering the headless architecture unusable for authenticated actions.

## Root Cause
The backend had global CSRF protection enabled in Production, but the frontend Axios client was not configured to retrieve the CSRF token from cookies or send it in the required `X-CSRFToken` header. Additionally, the backend was not automatically setting a CSRF cookie that the frontend could consume.

## Resolution
1.  **Backend:** Modified `application/__init__.py` to include an `@app.after_request` hook that sets a `csrf_token` cookie using `generate_csrf()`.
2.  **Config:** Updated `ProductionConfig` in `application/config.py` to explicitly enable CSRF and set `WTF_CSRF_TIME_LIMIT = None`.
3.  **Frontend:** Updated `frontend/src/api/client.js` to configure Axios with `xsrfCookieName: 'csrf_token'` and `xsrfHeaderName: 'X-CSRFToken'`.

## Changed Files
- `backend/application/__init__.py`: Added CSRF cookie hook.
- `backend/application/config.py`: Added production CSRF settings.
- `frontend/src/api/client.js`: Configured Axios for CSRF.

## Evidence
Verified by temporarily enabling CSRF in development. Attempts to update the user profile bio failed with `400 Bad Request` before the fix and succeeded after configuring both the backend hook and the frontend Axios client. Success was confirmed by observing the "Profile updated successfully!" message and verifying the data persistence in the UI.
