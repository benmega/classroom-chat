# API Reference - Classroom Chat

A high-level catalog of the backend's blueprints and endpoints. All are registered in `backend/application/routes/__init__.py`. This is the single API catalog for the backend (it replaces the former `API.md`). It is not exhaustive line-by-line — for the full, current list, print every registered route from `backend/`:

```bash
python -c "from application import create_app; app = create_app(); [print(r.rule, sorted(r.methods)) for r in sorted(app.url_map.iter_rules(), key=lambda r: r.rule)]"
```

## 1. Authentication & Session (`/user`)
- **`POST /user/login`**: Authenticates a user and starts a session. Returns user data and any awarded daily currency.
- **`POST /user/signup`**: New user registration (requires admin approval by default).
- **`GET /user/logout`**: Terminates the current session and disconnects the user's open sockets (a client of the same user on another device simply reconnects).
- **`GET /user/api/auth/status`**: Returns the current authenticated user's profile and roles.
- **`POST /user/api/auth/tutorial/complete`**: Marks the onboarding tutorial as complete for the current user.
- **`POST /api/session/heartbeat`**: Keeps the session/presence alive (used for online-status tracking). Returns `401` when there is no logged-in session (or the account no longer exists).
- **`/api/auth/cognito/*`**: Parent auth via AWS Cognito — `register`, `verify`, `login`, `forgot-password`, `confirm-forgot-password`.
- **`GET|POST /dev-login`, `/api/dev-login`**: Localhost-only dev shortcut for logging in as any role without credentials. Never registered when `FLASK_ENV=production`.

## 2. Admin API (`/api/admin`)
Split across `backend/application/routes/admin/*.py` by concern:
- **`dashboard_routes.py`**: `GET /dashboard` (aggregated stats), `GET /logs`, `GET /transactions`, `GET /export/transactions`, `GET /review_counts`.
- **`user_mgmt.py`**: user CRUD (`GET/POST/PUT /users`, `/user/<id>`), `create_user`, `remove_user`, `approve_user/<id>`, `reject_user/<id>`, `adjust_ducks`, `adjust_packets`, `reset_password`, classroom CRUD + enrollment (`/classrooms*`), parent-student linking (`/parents/<id>/children`, `/link`, `/unlink`), chapter progress overrides.
- **`project_routes.py`**: `GET /manage-projects`, `POST /handle-project-review/<id>`, `POST /assign-project`.
- **`standard_project_routes.py`**: CRUD for `/standard-projects`.
- **`trade_routes.py`**: `GET /pending_trades`, `POST /trade_action`.
- **`challenge_mgmt.py`**: `POST /challenges/bulk_add`.
- **`config_routes.py`**: `POST /toggle-message-sending`, `/update_duck_multiplier`, `/add-banned-word`.
- **`crud_routes.py`**: generic resource CRUD (`/schema/<resource>`, `GET/POST/PUT/DELETE /<resource>[/<id>]`) — backs the `react-admin` panel at `/admin/advanced-crud`.
- **`advanced_ops.py`**: `POST /advanced/purge-history`, `GET /advanced/stats-extended`.

All admin routes require `admin_only` (a session user whose `role` is `admin`).

## 3. Messaging (`/message`)
- **`GET /message/api/feed`**: Chat feed for the current user: global messages, messages in their classrooms, and direct messages (admins see everything unless a `classroom_id` is given).
- **`GET /message/api/me/context`**: Current user's messaging context: their classrooms (with sandbox state) and, for admins, the list of messageable users.
- **`DELETE /message/delete_message/<id>`**: Deletes a message (author/admin only).
- **WebSocket (`socket.io`)**, handlers in `backend/application/socket_events.py`: real-time message broadcast and presence. Sending a message is **not** an HTTP route: the client emits the `send_message` event and the server emits `message_received` to the target rooms. Other server events: `user_status_change`, `classroom_enrolled`, `activity_resolved`, `achievement_unlocked`, `message_deleted`, `sandbox_status_changed`. There is no `typing` event.

## 4. Ducks, Trading & Shop
- **`POST /duck_trade/submit_trade`**: Bit Shift trade request. JSON only (`digital_ducks` plus `bit_ducks` and `byte_ducks`, each a list of 8 non-negative integers); any other body is rejected with a 400.
- **`GET /api/shop/items`, `POST /api/shop/purchase/<item_id>`, `PUT /api/shop/configure`**: Store items and purchases.

## 5. Classrooms & Courses
- **`POST /api/classroom/join`, `GET /api/classroom/mine`**: Join-code based classroom enrollment; list the current user's classrooms.
- **`/api/course-requests/*`**: Student requests to change course track, and admin review.
- **`/api/project-templates`**: CRUD for reusable project templates (admin).
- **`GET|POST /challenge/submit`**: Challenge claim (honor system by design; csrf-exempt, CORS for codecombat.com / ozaria.com).

## 6. User Content
- **`GET /user/profile`, `GET /user/profile/<slug>`**: Own / public profile data.
- **`GET|POST /user/edit_profile`, `GET|POST /user/project/new`, `GET|POST /user/project/edit/<id>`**: Profile and project editing.
- **`POST /user/api/profile-picture`, `/api/profile-wallpaper`**: Multipart image uploads (crop-modal driven). Project thumbnails are sent with the project form; standard-project thumbnails use `POST /api/project-templates/upload-image` (admin).
- **`GET /user/api/users/search`**: User lookup/search.
- **`/notes/upload`, `/notes/view/<filename>`, `/notes/delete/<id>`**: Educational/admin note attachments.
- **`/api/achievements/*`**: Achievement listing, create/edit (`POST /add`, `PUT /edit/<id>`), certificate submission and review, downloads. There is no `/achievements/*` URL family any more.

## 7. Parents (`/api/parents`)
- **`GET /children`**: Linked students.
- **`GET /student/<id>/report`, `/student/<id>/history`**: Progress reports.
- **`POST /connect/code`, `POST /disconnect/<student_id>`**: Link/unlink via a student-provided connect code.
- **`POST /contact-teacher`**: Send a message to the teacher/admin.

## 8. Webhooks & Server Info
- **`POST /api/webhooks/youtube`, `POST /api/webhooks/transcribe`**: External integrations (e.g. Lambda transcriber in `infrastructure/lambda_transcriber/`).
- **`GET /server/health`**: Health check (used by `deploy.sh`'s post-deploy check).
- **`GET /`, `GET /<path>`**: SPA catch-all in `general_routes.py`; returns the React `index.html` via `application/utilities/spa.py` (production: `frontend/dist`). In development the React app runs on the Vite dev server, which proxies API paths to Flask.

---

## 9. Standard JSON Response Format
Most JSON API endpoints use a standard wrapper (`@api_response` decorator in `application/decorators/api_response.py`):
```json
{
  "status": "success | error",
  "data": { ... },
  "message": "Optional human-readable message",
  "error": "Optional error detail code"
}
```
A handful of legacy/session-rendered routes (e.g. the `/api/achievements` and some `/user` routes) predate this convention — check the route source before assuming the envelope.

---

## 10. Access Control
- **`login_required`**: Requires a valid session cookie (`application/decorators/login_required.py`).
- **`admin_only`**: Requires the authenticated user to have `role == "admin"` (`application/decorators/admin_required.py`).
- **CSRF**: Enforced by `flask-wtf` in production (disabled in the Development and Testing configs); the frontend reads the `csrf_token_v2` cookie and sends it back as a header on mutating requests. Routes marked `csrf.exempt` (for example `POST /challenge/submit`) skip it.
- **Ownership checks**: Applied in-route for user-specific content (projects, notes, messages).
