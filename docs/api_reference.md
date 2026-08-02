# API Reference - Classroom Chat

A high-level catalog of the backend's blueprints and endpoints. All are registered in `backend/application/routes/__init__.py`. This is not exhaustive line-by-line — for the full, current list, run the app and browse Swagger UI at `/api/docs` (spec: `/static/swagger.json`).

## 1. Authentication & Session (`/user`)
- **`POST /user/login`**: Authenticates a user and starts a session. Returns user data and any awarded daily currency.
- **`POST /user/signup`**: New user registration (requires admin approval by default).
- **`GET /user/logout`**: Terminates the current session.
- **`GET /user/api/auth/status`**: Returns the current authenticated user's profile and roles.
- **`POST /user/api/auth/tutorial/complete`**: Marks the onboarding tutorial as complete for the current user.
- **`POST /api/session/heartbeat`**: Keeps the session/presence alive (used for online-status tracking).
- **`/api/auth/cognito/*`**: Parent auth via AWS Cognito — `register`, `verify`, `login`, `forgot-password`, `confirm-forgot-password`.
- **`GET|POST /dev-login`, `/api/dev-login`**: Localhost-only dev shortcut for logging in as any role without credentials. Never registered when `FLASK_ENV=production`.

## 2. Admin API (`/api/admin`)
Split across `backend/application/routes/admin/*.py` by concern:
- **`dashboard_routes.py`**: `GET /dashboard` (aggregated stats), `GET /stats`, `GET /logs`, `GET /transactions`, `GET /export/transactions`, `GET /review_counts`.
- **`user_mgmt.py`**: user CRUD (`GET/POST/PUT /users`, `/user/<id>`), `create_user`, `remove_user`, `approve_user/<id>`, `reject_user/<id>`, `adjust_ducks`, `adjust_packets`, `reset_password`, `set_username`, classroom CRUD + enrollment (`/classrooms*`), parent-student linking (`/parents/<id>/children`, `/link`, `/unlink`), chapter progress overrides.
- **`project_routes.py`**: `GET /manage-projects`, `POST /handle-project-review/<id>`, `POST /assign-project`.
- **`standard_project_routes.py`**: CRUD for `/standard-projects`.
- **`trade_routes.py`**: `GET /pending_trades`, `POST /trade_action`.
- **`challenge_mgmt.py`**: `POST /challenges/bulk_add`.
- **`config_routes.py`**: `POST /toggle-ai`, `/toggle-message-sending`, `/update_duck_multiplier`, `/add-banned-word`.
- **`doc_routes.py`**: `GET /documents`, download/view/delete document, `GET /documents/stats`.
- **`crud_routes.py`**: generic resource CRUD (`/schema/<resource>`, `GET/POST/PUT/DELETE /<resource>[/<id>]`) — backs the `react-admin` panel at `/admin/advanced-crud`.
- **`advanced_ops.py`**: `POST /advanced/purge-history`, `GET /advanced/stats-extended`.

All admin routes require `admin_required` (session user with `is_admin=True`).

## 3. Messaging (`/message`)
- **`GET /message/api/feed`**: Chat feed for the current user's conversation(s).
- **`GET /message/api/me/context`**: Current user's messaging context (conversation membership, unread state, etc.).
- **`DELETE /message/delete_message/<id>`**: Deletes a message (author/admin only).
- **WebSocket (`socket.io`)**, handlers in `backend/application/socket_events.py`: real-time message broadcast, typing indicators, presence.

## 4. Ducks, Trading & Shop
- **`GET /duck_trade/`, `POST /duck_trade/submit_trade`**: Peer-to-peer currency trade requests.
- **`GET /duck_trade/bit_shift`**: Bit Shift (binary/decimal duck exchange) data.
- **`GET /api/shop/items`, `POST /api/shop/purchase/<item_id>`, `PUT /api/shop/configure`**: Store items and purchases.

## 5. Classrooms & Courses
- **`POST /api/classroom/join`, `GET /api/classroom/mine`**: Join-code based classroom enrollment; list the current user's classrooms.
- **`/track-requests/`, `/admin/track-requests/*`**: Student requests to change course track, and admin review.
- **`/api/project-templates`**: CRUD for reusable project templates (admin).

## 6. User Content
- **`GET /user/profile`, `GET /user/profile/<slug>`**: Own / public profile data.
- **`GET|POST /user/edit_profile`, `GET|POST /user/project/new`, `GET|POST /user/project/edit/<id>`**: Profile and project editing.
- **`POST /user/api/profile-picture`, `/api/project-image`, `/api/profile-wallpaper`**: Multipart image uploads (crop-modal driven).
- **`GET /user/api/users/search`, `/get_users`, `/get_user_id`**: User lookup/search.
- **`/notes/upload`, `/notes/view/<filename>`, `/notes/delete/<id>`**: Educational/admin note attachments.
- **`/achievements/*` (session) and `/api/achievements/*` (JSON)**: Achievement listing, certificate submission and review, downloads.
- **`POST /ai/get_ai_response`**: AI teacher chat responses (OpenAI-backed, toggleable via admin config).
- **`POST /upload/upload_file`, `GET /upload/uploads/<filename>`**: Generic file upload/serving.

## 7. Parents (`/api/parents`)
- **`GET /children`**: Linked students.
- **`GET /student/<id>/report`, `/student/<id>/history`**: Progress reports.
- **`POST /connect/code`, `POST /disconnect/<student_id>`**: Link/unlink via a student-provided connect code.
- **`POST /contact-teacher`**: Send a message to the teacher/admin.

## 8. Webhooks & Server Info
- **`POST /webhooks/youtube`, `POST /webhooks/transcribe`**: External integrations (e.g. Lambda transcriber in `infrastructure/lambda_transcriber/`).
- **`GET /server/ip`, `GET /server/health`**: Health check (used by `deploy.sh`'s post-deploy check) and IP info.

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
A handful of legacy/session-rendered routes (e.g. some `/achievements` and `/user` GET routes) predate this convention — check the route source before assuming the envelope.

---

## 10. Access Control
- **`login_required`**: Requires a valid session cookie (`application/decorators/login_required.py`).
- **`admin_required`**: Requires the authenticated user to have `is_admin=True` (`application/decorators/admin_required.py`).
- **CSRF**: Enforced by `flask-wtf`; the frontend reads the `csrf_token_v2` cookie and sends it back as a header on mutating requests.
- **Ownership checks**: Applied in-route for user-specific content (projects, notes, messages).
