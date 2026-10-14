# API Reference - Classroom Chat

A high-level catalog of the backend's blueprints and endpoints. All are registered in `backend/application/routes/__init__.py`. This is the single API catalog for the backend (it replaces the former `API.md`). It is not exhaustive line-by-line — for the full, current list, print every registered route from `backend/`:

```bash
python -c "from application import create_app; app = create_app(); [print(r.rule, sorted(r.methods)) for r in sorted(app.url_map.iter_rules(), key=lambda r: r.rule)]"
```

Timestamps in responses and socket payloads are ISO 8601 in UTC with a trailing `Z` (for example `2026-01-02T03:04:05Z`), produced by `to_utc_iso` in `backend/application/utilities/helper_functions.py`. The one exception is the generic CRUD API (section 2, `crud_routes.py`), which returns column values as stored. The frontend reads every timestamp through `parseServerDate` in `frontend/src/utils/formatters.js`, which also takes an offset-less string as UTC.

## 1. Authentication & Session (`/user`)
- **`POST /user/login`**: Authenticates a user and starts a session. Returns user data and any awarded daily currency.
- **`POST /user/signup`**: New user registration (requires admin approval by default).
- **`POST /user/logout`**: Terminates the current session and disconnects the user's open sockets (a client of the same user on another device simply reconnects). CSRF-protected like every other POST, except that a session that has already expired is answered as signed out rather than with a 400. `GET /user/logout` is deprecated: it is kept for one release so a frontend bundle built before the switch can still sign out, and should be removed after that. The current bundle sends POST and falls back to GET only when the backend answers it with 405 (a backend from before the switch); that fallback in `useAuthStore.js` goes away with the GET route.
- **`GET /user/api/auth/status`**: Returns the current authenticated user's profile and roles.
- **`POST /user/api/auth/tutorial/complete`**: Marks the onboarding tutorial as complete for the current user.
- **`POST /api/session/heartbeat`**: Keeps the session/presence alive (used for online-status tracking). Returns `401` when there is no logged-in session (or the account no longer exists).
- **`/api/auth/cognito/*`**: Parent auth via AWS Cognito — `register`, `verify`, `login`, `forgot-password`, `confirm-forgot-password`.
- **`GET|POST /dev-login`, `/api/dev-login`**: Localhost-only dev shortcut for logging in as any role without credentials. Never registered when `FLASK_ENV=production`.

## 2. Admin API (`/api/admin`)
Split across `backend/application/routes/admin/*.py` by concern:
- **`dashboard_routes.py`**: `GET /dashboard` (aggregated stats), `GET /logs`, `GET /transactions`, `GET /export/transactions`, `GET /review_counts`.
- **`user_mgmt.py`**: user CRUD (`GET/POST/PUT /users`, `/user/<id>`), `create_user`, `remove_user`, `approve_user/<id>`, `reject_user/<id>`, `adjust_ducks`, `adjust_packets`, `reset_password`, classroom CRUD + enrollment (`/classrooms*`), parent-student linking (`/parents/<id>/children`, `/link`, `/unlink`), chapter progress overrides.
- **`project_routes.py`**: `GET /manage-projects`, `POST /handle-project-review/<id>`, `POST /assign-project` (optional `project_type`, `code` or `3d`, else the type of the template whose name matches, else `code`; any other value is a 400).
- **`standard_project_routes.py`**: CRUD for `/standard-projects`.
- **`trade_routes.py`**: `GET /pending_trades`, `POST /trade_action`.
- **`challenge_mgmt.py`**: `POST /challenges/bulk_add`.
- **`config_routes.py`**: `POST /toggle-message-sending`, `/update_duck_multiplier`, `/add-banned-word`.
- **`crud_routes.py`**: generic resource CRUD (`/schema/<resource>`, `GET/POST/PUT/DELETE /<resource>[/<id>]`) — backs the `react-admin` panel at `/admin/advanced-crud`.
- **`advanced_ops.py`**: `POST /advanced/purge-history`.

All admin routes require `admin_only` (a session user whose `role` is `admin`).

## 3. Messaging (`/message`)
- **`GET /message/api/feed`**: Chat feed for the current user: global messages, messages in their classrooms, and direct messages (admins see everything unless a `classroom_id` is given). `limit` is clamped to 1-100 (default 50); page back with `before_id`.
- **`GET /message/api/unread-count`**: Unread badge without the messages: `{count, latest_id}` for the newest 50 messages the feed would show; `count` is those newer than `last_read_id`, `latest_id` is the newest visible id (or `null`).
- **`GET /message/api/me/context`**: Current user's messaging context: their classrooms (with sandbox state) and, for admins, the list of messageable users.
- **`DELETE /message/delete_message/<id>`**: Deletes a message (author/admin only).
- **WebSocket (`socket.io`)**, handlers in `backend/application/socket_events.py`: real-time message broadcast and presence. Sending a message is **not** an HTTP route: the client emits the `send_message` event and the server emits `message_received` to the target rooms. Other server events: `user_status_change`, `classroom_enrolled`, `activity_resolved`, `achievement_unlocked`, `message_deleted`, `sandbox_status_changed`. There is no `typing` event.

## 4. Ducks, Trading & Shop
- **`POST /duck_trade/submit_trade`**: Bit Shift trade request. JSON only (`digital_ducks` plus `bit_ducks` and `byte_ducks`, each a list of 8 non-negative integers); any other body is rejected with a 400.
- **`GET /api/shop/items`, `POST /api/shop/purchase/<item_id>`, `PUT /api/shop/configure`**: Store items and purchases.

## 5. Classrooms & Courses
- **`POST /api/classroom/join`, `GET /api/classroom/mine`**: Join-code based classroom enrollment; list the current user's classrooms.
- **`/api/course-requests/*`**: Student requests to change course track, and admin review.
- **`/api/project-templates`**: CRUD for reusable project templates (admin). `POST` and `PUT` take an optional `project_type` (`code`, the default, or `3d`; any other value is a 400; a `PUT` without it keeps the template's type).
- **`GET|POST /challenge/submit`**: Challenge claim (honor system by design; csrf-exempt, CORS for codecombat.com / ozaria.com).

## 6. User Content
- **`GET /user/profile`, `GET /user/profile/<slug>`**: Own / public profile data.
- **`GET|POST /user/edit_profile`, `GET|POST /user/project/new`, `GET|POST /user/project/edit/<id>`**: Profile and project editing.
- **Project files and type** (multipart fields of `POST /user/project/new` and `POST /user/project/edit/<id>`, next to the project's other fields):
    - `project_type`: `code` or `3d`; anything else is a 400. Without it a new project takes its template's type (`code` when it has no template), and an edit keeps the type.
    - `model_files`, `source_files`, `asset_files`: any number of file parts each. A source or asset part's file name may carry a folder path (`src/main.py` from a folder upload), which becomes the file's `path`; a model keeps only its name. Allowed types: models `stl obj glb gltf 3mf ply`; source files `py js jsx ts tsx mjs cjs html htm css scss json md txt java c h cpp hpp cs go rs rb php lua sql xml yml yaml toml ini csv gd kt swift sh bat ps1 r m` (UTF-8 text, always served as plain text); assets `png jpg jpeg gif webp` (checked by the image pipeline), `mp3 wav ogg m4a`, `pdf`. Caps: 50 MB per model, 1 MB per source file, 10 MB per asset, 40 files and 150 MB per project (`PROJECT_*` in `config.py`).
    - `remove_file_ids`: ids of the project's files to delete, as a repeated field and/or comma-separated. An id that is not one of the project's files is a 400.
    - Everything is checked before anything is written, counting the project's files as they will be after the removals and additions. A file whose path the project already has replaces it under a new id. A rejected upload answers 400 (413 for a size cap) with a message that can be shown, and keeps nothing.
    - Projects in JSON (`to_dict()`, wherever projects are returned) carry `project_type` and `files`: `[{id, kind, name, path, size, content_type, url, download_url, created_at}]`, models first, then source files, then assets, each kind by path. `url` and `download_url` start with `/` (the frontend prefixes the API base).
- **`GET /user/project_files/<file_id>/<filename>`**: Serves a project file. Public, like the profiles that show it; limited to 100 requests a minute. `filename` must be the file's own name (404 otherwise, and for an unknown id). Source files are always `text/plain; charset=utf-8`, models `model/stl`, `model/obj`, `model/gltf-binary`, `model/gltf+json`, `model/3mf` or `application/octet-stream` (ply), assets the verified image type, `audio/*` or `application/pdf`. `?download=1` sends `Content-Disposition: attachment`, otherwise `inline`. Always `X-Content-Type-Options: nosniff` and `Cache-Control: public, max-age=86400` (a file id never changes content). Range requests are answered.
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
- **`GET /`, `GET /<path>`**: SPA catch-all in `general_routes.py`; renders the React `index.html` from `frontend/dist` via `application/utilities/spa.py` when a build is there, and otherwise returns a JSON 404. The deployed SPA is not served by Flask: it is hosted on S3 + CloudFront (see [infrastructure_and_devops.md](infrastructure_and_devops.md)). In development the React app runs on the Vite dev server, which proxies API paths to Flask.

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
For error statuses (>= 400) `error` is always a string. A view that returns a dict body such as `{"conflict": true, "message": "...", "current_owner": "..."}` gets `error` set from its `error` (or else `message`) text, and the dict's other keys are placed next to `error` at the top level. Unhandled exceptions return `"Internal server error"` and roll the database session back.
A handful of legacy/session-rendered routes (e.g. the `/api/achievements` and some `/user` routes) predate this convention — check the route source before assuming the envelope.

---

## 10. Access Control
- **`login_required`**: Requires a valid session cookie; anonymous requests get a JSON `401` (`application/decorators/login_required.py`).
- **`admin_only`**: Requires the authenticated user to have `role == "admin"`; anonymous requests get a JSON `401` and other users a JSON `403`, whatever the client accepts (`application/decorators/admin_required.py`).
- **CSRF**: Enforced by `flask-wtf` in production (disabled in the Development and Testing configs); the frontend reads the `csrf_token_v2` cookie and sends it back as a header on mutating requests. Routes marked `csrf.exempt` (for example `POST /challenge/submit`) skip it.
- **Ownership checks**: Applied in-route for user-specific content (projects, notes, messages).
