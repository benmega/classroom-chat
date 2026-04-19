# Admin Advanced Panel: Log Viewer Disabled

## Description
The "Open Log Viewer" button in the Admin Advanced Panel is currently hardcoded to display a "Legacy log viewer disabled" error toast.

## Root Cause
Logging was only configured to output to the console (stdout), and the frontend button lacked a corresponding backend endpoint to fetch log data.

## Resolution
1.  **Backend Logging**: Updated `backend/application/__init__.py` to use a `FileHandler`, persisting logs to `instance/app.log`.
2.  **API Endpoint**: Added a new `/api/admin/logs` route in `dashboard_routes.py` that reads and returns the last 500 lines of `app.log`.
3.  **Frontend Implementation**:
    - Updated `AdvancedPanel.jsx` to replace the error toast with a `fetchLogs` function.
    - Implemented a premium-styled log modal using `glass-panel` and dark-themed code block styling.
    - Added "Refresh" and "Close" functionality to the modal.

## Changed Files
- `backend/application/__init__.py`
- `backend/application/routes/admin/dashboard_routes.py`
- `frontend/src/pages/Admin/AdvancedPanel.jsx`
- `frontend/src/pages/Admin/AdvancedPanel.css`

## Evidence
- Log Viewer Modal: [log_viewer_verification_1776393302632.png](file:///C:/Users/Ben/.gemini/antigravity/brain/1a3ce265-eb46-4bdd-8434-dfe015502aa3/log_viewer_verification_1776393302632.png)

## Impact
Medium - Admins can now conveniently monitor server activity and debug issues directly from the browser.
