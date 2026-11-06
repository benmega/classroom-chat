# Classroom Chat Route Map

Frontend routes and who can open them, from [`frontend/src/App.jsx`](../frontend/src/App.jsx) (`ProtectedRoute`,
`ProtectedLayout`, `GuestRoute` and the `adminOnly` and `parentOnly` props are the guards). Backend endpoints:
see [api_reference.md](./api_reference.md). Chat messages go over Socket.IO (`send_message`, see there), not
HTTP.

| Access | Paths |
| :--- | :--- |
| Public | `/`, `/profile/:slug`, `/parent/connect` |
| Signed-out only (a signed-in user is redirected away) | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| Vite dev server only | `/dev-login` |
| Student (any signed-in user; a parent is redirected to `/parent/dashboard` except on `/profile`, `/settings` and `/join-class`) | `/chat`, `/profile`, `/settings`, `/course-progress/:slug`, `/course-progress/:slug/breakdown`, `/project-info/:projectId`, `/achievements`, `/bit-shift`, `/shop`, `/activity`, `/project/new`, `/project/edit/:projectId`, `/tests`, `/tests/:slug`, `/tests/results/:attemptId` |
| Student, outside the layout guard | `/join-class?code=...` signs itself in: a signed-out visitor is sent to `/login` first, a parent is told parents cannot join |
| Parent | `/parent/dashboard`, `/parent/report/:studentId`, `/parent/tests/results/:attemptId`, `/parent/course-progress/:slug`, `/parent/course-progress/:slug/breakdown` |
| Admin | `/admin/dashboard`, `/admin/to-review`, `/admin/assign-project`, `/admin/library`, `/admin/users`, `/admin/users/:userId`, `/admin/classes`, `/admin/classes/:classId`, `/admin/classes/:classId/kiosk`, `/admin/submissions`, `/admin/advanced`, `/admin/advanced-crud/*`, `/admin/transactions`, `/admin/student-activity`, `/admin/tests`, `/admin/tests/new`, `/admin/tests/results/:attemptId` |

The three test-result routes (`/tests/results/:attemptId`, `/parent/tests/results/:attemptId`,
`/admin/tests/results/:attemptId`) render the same page; the prefix picks the viewer and the back link.

Old `/admin/*` URLs (`students`, `parents`, `connections`, `analytics`, `projects`, `certificates`,
`pending-*`, `standard-projects`, `add-*`, `documents`, `review`) redirect to `users`, `dashboard`,
`to-review` or `library`; `/user/profile/:slug` redirects to `/profile/:slug`; unknown paths redirect to `/`.
