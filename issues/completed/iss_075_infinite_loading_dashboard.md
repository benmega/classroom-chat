# Infinite loading screen on /dashboard and /home

## Description
When navigating to `/dashboard`, `/home`, or `/bit-shift`, the application remains stuck on a "Preparing your workspace..." loading screen indefinitely.

## Steps to Reproduce
1. Log in as a student (`blossomstudent01`).
2. Manually navigate to `http://localhost:5173/dashboard` or click on any link leading to it.
3. Observe the persistent loading state.

## Expected Result
The user should be redirected to a functional dashboard or the specific page content should load correctly.

## Actual Result
The page stays on "Preparing your workspace..." and never resolves.

## Impact
Major - Prevents users from accessing core dashboard features and secondary internal pages.

## Screenshots
![Persistent Loading](file:///C:/Users/Ben/.gemini/antigravity/brain/4f231549-3ea7-4b97-9dbb-180fb4a072bc/.system_generated/click_feedback/click_feedback_1776258018144.png)
*(Note: Using latest click feedback as reference for the navigation attempt)*

## Resolution
- Recreated missing `DuckTransaction` model in `application/models/duck_transaction.py`.
- Updated `application/models/__init__.py` to register the new model.
- Fixed broken imports in `achievement_routes.py` and `message_routes.py` that were referencing non-existent paths or variables after recent refactoring.
- Initialized the `duck_transactions` database table.

## Root Cause
The backend was failing to boot because of multiple `ImportError` and `ModuleNotFoundError` introduced during a recent monolithic-to-modular refactoring. Specifically, the `DuckTransaction` model was missing entirely, and several blueprints were still trying to import decorators/variables from the old `admin_routes.py` path. Because the backend was down, the frontend's `checkAuth` logic could not complete successfully, keeping the app in a perpetual "Preparing your workspace..." loading state.

## Changed Files
- `backend/application/models/duck_transaction.py` (Created)
- `backend/application/models/__init__.py` (Updated)
- `backend/application/routes/achievement_routes.py` (Updated)
- `backend/application/routes/message_routes.py` (Updated)
