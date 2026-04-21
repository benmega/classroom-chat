# iss_127_missing_jinja2_filter_format_number
**Status**: Completed
**Resolution Date**: 2026-04-19
**Priority**: High
**Type**: Backend Regression

## Description
Following a "house cleaning" refactor of the backend routes and utilities, the custom Jinja2 template filter `format_number` was accidentally removed or not re-registered. This caused a `TemplateRuntimeError` on any page using the global `base.html` (including the dev login landing page), specifically when trying to display user duck balances.

## Resolution
- Implemented `format_number` utility in `backend/application/utilities/helper_functions.py`.
- Registered the filter in the Flask application instance within `backend/application/__init__.py`.
- Verified that the filter correctly handles thousands separators and optional floating point precision.
