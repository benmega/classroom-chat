# Classroom Chat Route Map

## Application Routes (Frontend)

Every available page in the React application and its required user role, mapped from `App.jsx`.

|Path|Required Role|
|-|-|
|`/`|Public (Landing)|
|`/login`|Public (Guest)|
|`/signup`|Public (Guest)|
|`/forgot-password`|Public (Guest)|
|`/reset-password`|Public (Guest)|
|`/dev-login`|Development Only|
|`/chat`|Student|
|`/profile`|Student|
|`/profile/:slug`|Public (View Profile)|
|`/course-progress/:slug`|Student / Parent|
|`/course-progress/:slug/breakdown`|Student / Parent|
|`/project-info/:projectId`|Student|
|`/achievements`|Student|
|`/bit-shift`|Student|
|`/shop`|Student|
|`/activity`|Student|
|`/settings`|Student|
|`/project/new`|Student|
|`/project/edit/:projectId`|Student|
|`/join-class`|Student / Parent|
|`/parent/dashboard`|Parent|
|`/parent/report/:studentId`|Parent|
|`/parent/connect`|Parent / Public|
|`/admin/dashboard`|Admin|
|`/admin/to-review`|Admin|
|`/admin/assign-project`|Admin|
|`/admin/library`|Admin|
|`/admin/users`|Admin|
|`/admin/classes`|Admin|
|`/admin/classes/:classId`|Admin|
|`/admin/users/:userId`|Admin|
|`/admin/submissions`|Admin|
|`/admin/advanced`|Admin|
|`/admin/transactions`|Admin|
|`/admin/student-activity`|Admin|
|`/admin/classes/:classId/kiosk`|Admin|
|`/admin/advanced-crud/*`|Admin|

## Backend API Endpoints

The backend routes have been significantly refactored. Please refer to **[`api_reference.md`](./api_reference.md)** for a complete, up-to-date catalog of all backend API endpoints and their corresponding blueprints.

Key changes include:
- The introduction of a React-Admin CRUD interface at `/admin/advanced-crud` backed by `/admin/crud`.
- Restructured messaging API without public conversation histories.
- Unified admin operations under the `admin_bp` blueprint.
