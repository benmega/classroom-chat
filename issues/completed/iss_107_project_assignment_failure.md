# iss_107_project_assignment_failure
**Status**: Resolved
**Priority**: Medium
**Type**: Bug

## Description
When an admin navigates to another user's profile and attempts to edit their project, general edits persist successfully. However, when attempting to reassign the project from one student to a different student, the project reassignment fails.

## Steps to Reproduce
1. Log in as admin.
2. Go to a user's profile.
3. Attempt to edit an existing project and change the assigned student to someone else.
4. Note that the assignment fails to persist.

## Root Cause
The `edit_project` route in `backend/application/routes/user_routes.py` lacked the logic to update the `user_id` field of the `Project` model, even when the request included a `student_id` (sent by the frontend when an admin is editing).

## Resolution
Modified the `edit_project` function to check for a `student_id` in the request if the current user is an admin. If present, it validates the new student and updates the project's `user_id`.

## Changed Files
- `backend/application/routes/user_routes.py`
