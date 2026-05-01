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

Key functional endpoints identified across backend blueprints.

| Path | Handler | Required Role | Blueprint |
| :--- | :--- | :--- | :--- |
| `/user/login` | `login` | Public | `user_routes.py` |
| `/user/api/auth/status` | `auth_status` | Public | `user_routes.py` |
| `/user/logout` | `logout` | Public | `user_routes.py` |
| `/user/signup` | `signup` | Public | `user_routes.py` |
| `/user/profile` | `profile` | Student | `user_routes.py` |
| `/user/profile/<slug>` | `view_user_profile` | Public | `user_routes.py` |
| `/user/edit_profile` | `edit_profile` | Student | `user_routes.py` |
| `/user/project/new` | `new_project` | Student | `user_routes.py` |
| `/user/project/edit/<id>` | `edit_project` | Student | `user_routes.py` |
| `/admin/dashboard` | `dashboard` | Admin | `admin_routes.py` |
| `/admin/approve_user/<id>` | `approve_user` | Admin | `admin_routes.py` |
| `/admin/reject_user/<id>` | `reject_user` | Admin | `admin_routes.py` |
| `/admin/update_duck_multiplier` | `update_duck_multiplier` | **Public (Risk!)** | `admin_routes.py` |
| `/admin/project/edit/<id>` | `edit_project_details` | **Public (Risk!)** | `admin_routes.py` |
| `/message/send_message` | `send_message` | Student | `message_routes.py` |
| `/message/api/conversations/<id>` | `get_conversation_history` | **Public (Risk!)** | `message_routes.py` |
| `/message/view_conversation/` | `view_conversation` | Public | `message_routes.py` |
| `/achievements/` | `achievements_page` | Student | `achievement_routes.py` |
| `/achievements/submit_certificate` | `submit_certificate` | Student | `achievement_routes.py` |
| `/achievements/view_certificate/<id>` | `view_certificate` | Public | `achievement_routes.py` |
| `/challenge/submit` | `submit_challenge` | Student | `challenge_routes.py` |
| `/session/heartbeat` | `heartbeat` | Student | `session_routes.py` |

## Orphaned Routes

| Route | Type | Description |
| :--- | :--- | :--- |
| `/settings` | Frontend | No direct link in sidebar/dropdown. Only accessible from the Profile page. |
| `/admin/dashboard` | Frontend | Exists but navigation links only to `/admin`. |
| `/admin/set_username` | Backend | No UI or API call found in the current application. |
| `/admin/verify_password` | Backend | Legacy route, not used by the current frontend. |
| `/admin/clear-partial-history`| Backend | Functional but missing a corresponding button in the Admin UI. |
| `/admin/strike_message/<id>` | Backend | Not linked in the Chat or Dashboard UI. |

## Security Discrepancies & Discovered Flaws

| Path | Risk | Fault Description |
| :--- | :--- | :--- |
| `/admin/update_duck_multiplier` | **Critical** | Missing `@admin_only` decorator. Any user can manipulate global reward rates. |
| `/admin/project/edit/<id>` | **High** | Missing `@admin_only` decorator. Publicly editable project metadata. |
| `/message/api/conversations/<id>` | **High** | Public access to sensitive private chat histories without ownership check. |
| `/achievements/view_certificate/` | **Medium** | Student certificates are served publicly viacert_id. |
| `/message/view_conversation/` | **Medium** | Publicly accessible conversation view. |
| `Profile/index.jsx` Broken Link | **Functional** | Links to `/admin/certificates/view/` which 404s (should be `/achievements/view_certificate/`). |
