# Classroom Chat Route Map

## Application Routes (Frontend)

Every available page in the React application, its component, and its required user role.

| Path | Component | Required Role | Sources |
| :--- | :--- | :--- | :--- |
| `/` | `Chat` | Student | `App.jsx`, `Layout.jsx` |
| `/login` | `Login` | Public (Guest) | `App.jsx` |
| `/signup` | `Signup` | Public (Guest) | `App.jsx` |
| `/profile/:slug?` | `Profile` | Student | `App.jsx`, `Layout.jsx` |
| `/achievements` | `Achievements` | Student | `App.jsx`, `Layout.jsx` |
| `/bit-shift` | `BitShift` | Student | `App.jsx`, `Layout.jsx` |
| `/submit-certificate` | `SubmitCertificate` | Student | `App.jsx`, `Layout.jsx` |
| `/submit-challenge` | `SubmitChallenge` | Student | `App.jsx`, `Layout.jsx` |
| `/history` | `History` | Student | `App.jsx`, `Layout.jsx` |
| `/settings` | `EditProfile` | Student | `App.jsx`, `Profile/index.jsx` |
| `/project/new` | `ManageProject` | Student | `App.jsx`, `Profile/index.jsx` |
| `/project/edit/:projectId` | `ManageProject` | Student | `App.jsx`, `Profile/index.jsx` |
| `/admin` | `AdminDashboard` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/dashboard` | `AdminDashboard` | Admin | `App.jsx` |
| `/admin/pending-users` | `PendingUsers` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/pending-trades` | `PendingTrades` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/projects` | `AdminProjects` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/add-achievement` | `AdminAchievements` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/certificates` | `AdminCertificates` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/documents` | `AdminDocuments` | Admin | `App.jsx`, `AdminLayout.jsx` |
| `/admin/advanced` | `AdvancedPanel` | Admin | `App.jsx`, `AdminLayout.jsx` |

## Backend API Endpoints

The complete, verified backend catalogue lives in [api_reference.md](api_reference.md). Blueprint
prefixes (`backend/application/routes/__init__.py`): admin `/api/admin`, user `/user`, ai `/ai`,
upload `/upload`, message `/message`, duck_trade `/duck_trade`, achievements `/achievements` and
`/api/achievements`, session `/api/session`, notes `/notes`, webhooks `/api/webhooks`, challenge
`/challenge`, server_info `/server`, dev login `/dev-login` and `/api/dev-login` (non-production only).

Key endpoints used by the React app:

| Path | Handler | Access | Source |
| :--- | :--- | :--- | :--- |
| `/user/login` | `login` | Public | `user_routes.py` |
| `/user/api/auth/status` | `auth_status` | Public | `user_routes.py` |
| `/user/logout` | `logout` | Public | `user_routes.py` |
| `/user/signup` | `signup` | Public | `user_routes.py` |
| `/user/profile` | `profile` | Login | `user_routes.py` |
| `/user/profile/<slug>` | `view_user_profile` | Public (by design) | `user_routes.py` |
| `/user/edit_profile` | `edit_profile` | Login | `user_routes.py` |
| `/user/project/new`, `/user/project/edit/<id>` | `new_project`, `edit_project` | Login | `user_routes.py` |
| `/api/admin/dashboard` | `dashboard_data` | Admin | `admin/dashboard_routes.py` |
| `/api/admin/approve_user/<id>`, `/api/admin/reject_user/<id>` | `approve_user`, `reject_user` | Admin | `admin/user_mgmt.py` |
| `/api/admin/update_duck_multiplier` | `update_duck_multiplier` | Admin | `admin/config_routes.py` |
| `/api/admin/manage-projects`, `/api/admin/handle-project-review/<id>` | project review | Admin | `admin/project_routes.py` |
| `/api/admin/crud/<resource>` | React-Admin CRUD | Admin | `admin/crud_routes.py` |
| `/message/api/conversations/<user_id>` | `get_conversation_history` | Login (owner or admin) | `message_routes.py` |
| `/message/view_conversation/<conversation_id>` | `view_conversation` | Login | `message_routes.py` |
| `/api/achievements/view_certificate/<id>` | `api_view_certificate` | Public (by design) | `api_achievements.py` |
| `/api/achievements/submit_certificate` | `api_submit_certificate` | Student | `api_achievements.py` |
| `/challenge/submit` | `submit_challenge` | Honor system (by design) | `challenge_routes.py` |
| `/api/session/heartbeat` | `heartbeat` | Student | `session_routes.py` |

Chat messages are not sent over HTTP. The client emits the Socket.IO `send_message` event
(`useChatSocket.js`); the server handles it in `socket_events.py`, and reports failures via
`message_error`.

## Orphaned Routes

| Route | Type | Description |
| :--- | :--- | :--- |
| `/settings` | Frontend | No direct link in sidebar/dropdown. Only accessible from the Profile page. |
| `/admin/dashboard` | Frontend | Exists but navigation links only to `/admin`. |

## Access Notes

- Public by design: user profiles, user search, certificate view/download, challenge claims (honor system).
- `/api/admin/*` routes are protected with `@admin_only`.
- Frontend paths for certificates use `/api/achievements/view_certificate/<id>` (see
  `frontend/src/components/profile/CertificationsList.jsx`, `pages/Admin/AdminCertificates.jsx`).
