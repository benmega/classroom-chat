# Project Edit Page Performance

## Description
Loading the project edit page (for admins or project owners) is extremely slow, taking upwards of 10 seconds.

## Symptoms
- Long wait times when clicking "Edit" on a project.
- Potential backend bottleneck or excessive data fetching on the frontend.

## Recommended Solution
1. Profile the `/api/projects/<id>` or equivalent endpoint to check for slow DB queries.
2. Check the frontend `EditProject.jsx` (or similar) to see if it makes redundant API calls.
3. Implement caching or optimize data serialization if necessary.

## Impact
High - Long load times significantly degrade the user experience for contributors and admins.

## Root Cause
The backend project creation/edit routes were fetching all users using the full `User.to_dict()` serialization for the student selection dropdown. Since `User.to_dict()` includes an expensive 1-year contribution graph calculation (iterating over 365 days of logs per user), fetching 99+ users resulted in tens of thousands of processing iterations and redundant database queries on every page load. Additionally, the frontend was making sequential API calls and some model attributes (like total challenge counts) were being recalculated multiple times without caching.

## Resolution
1. **Optimized Backend Serialization**: Changed the student list fetching in `user_routes.py` to use a lightweight `{"id": u.id, "username": u.username}` format instead of the heavy `to_dict()`.
2. **Implemented Caching**: Added a class-level cache in the `User` model to store total challenge counts per domain, preventing redundant database counts during user serialization.
3. **Parallelized Frontend Requests**: Updated `ManageProject.jsx` to use `Promise.all` for fetching student and project data simultaneously, reducing wait time for the user.

## Changed Files
- `backend/application/routes/user_routes.py`: Optimized student list serialization.
- `backend/application/models/user.py`: Added caching for challenge counts.
- `frontend/src/pages/User/ManageProject.jsx`: Parallelized API calls and optimized loading logic.
