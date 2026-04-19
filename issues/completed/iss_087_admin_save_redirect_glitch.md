# Admin Save Redirect Glitch

## Description
When an admin edits a student's project from the student's profile page, hitting "Save" redirects the admin to their own profile page instead of returning to the student's profile.

## Symptoms
- Incorrect redirection logic after a successful project update by an admin.
- Admin loses context of the student they were just reviewing.

## Recommended Solution
1. Update the redirection logic in the project save handler.
2. Ensure the `return_url` or `userId` is preserved and used to redirect back to the originating profile.

## Impact
Medium - Annoying workflow interruption for admins managing student content.

## Root Cause
The redirection logic in `ManageProject.jsx` was hardcoded to `/profile`, which always defaults to the currently logged-in user's profile. For administrators editing a student's project, this caused them to lose context and be redirected to their own profile page instead of the student's page they were just viewing.

## Solution
1. Updated the backend `/user/project/new` endpoint to include the `slug` for each student in the list provided to admins.
2. Updated the frontend `ManageProject.jsx` to check if the current user is an admin and if a `student_id` is present. If so, it finds the student's slug and redirects to `/profile/${slug}` instead of the generic `/profile`.

## Changed Files
- `backend/application/routes/user_routes.py`: Included `slug` in student list for admins.
- `frontend/src/pages/User/ManageProject.jsx`: Implemented context-aware redirection.
