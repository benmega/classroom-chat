# API Reference - Classroom Chat

This is the single API catalogue for the backend (it replaces the former `API.md`). It was
checked against the Flask blueprints in `backend/application/routes/` and the prefixes registered
in `backend/application/routes/__init__.py`. To regenerate the raw list, run from `backend/`:

```bash
python -c "from application import create_app; app = create_app(); [print(r.rule, sorted(r.methods)) for r in sorted(app.url_map.iter_rules(), key=lambda r: r.rule)]"
```

The Swagger UI blueprint is served at `/api/docs` (spec at `/static/swagger.json`, which may lag behind the code).

## Conventions

- **Auth** column: `login` = `@require_login` decorator, `admin` = `@admin_only` decorator,
  `-` = no decorator. A route with `-` may still check the session inside the handler
  (for example the achievements and certificate routes) or be public by design
  (profiles, user search, certificate view/download, `/server/health`).
- Sessions are cookie based. CSRF protection is enabled in production; routes marked
  `csrf.exempt` (for example `POST /challenge/submit`) skip it.
- Many JSON routes use the `api_response` decorator, which wraps responses as
  `{ "status": "success | error", "data": ..., "message": ..., "error": ... }`. Some routes return
  plain JSON instead; check the handler.

## 1. Authentication and users (`/user`)

| Method | Path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| GET, POST | `/user/login` | - | Start a session; may award the daily duck bonus |
| GET | `/user/logout` | - | End the session |
| POST | `/user/signup` | - | Register (requires admin approval by default) |
| GET | `/user/api/auth/status` | - | Current user's profile and roles |
| GET | `/user/profile` | login | Own profile |
| GET | `/user/profile/<slug>` | - | Public profile |
| GET, POST | `/user/edit_profile` | login | Edit own profile |
| GET, POST | `/user/project/new` | login | Create a project |
| GET, POST | `/user/project/edit/<project_id>` | login | Edit a project |
| POST | `/user/api/profile-picture` | login | Multipart profile picture upload |
| POST | `/user/api/project-image` | login | Multipart project image upload |
| POST | `/user/delete_profile_picture` | login | Reset profile picture |
| POST | `/user/remove_skill/<skill_id>` | login | Remove a skill |
| GET | `/user/get_users` | login | Simple user list |
| GET | `/user/get_user_id` | login | Current user id |
| GET | `/user/api/users/search` | - | User search (public by design) |
| GET | `/user/profile_pictures/<path>` | - | Serve a profile picture |
| GET | `/user/project_images/<path>` | - | Serve a project image |

## 2. Messaging (`/message`)

Sending a message is **not** an HTTP route. Messages are sent only through the Socket.IO
`send_message` event (see section 9). The HTTP routes below manage and read conversations.

| Method | Path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/message/start_conversation` | - | Create a conversation |
| POST | `/message/update_conversation` | login | Update a conversation |
| DELETE | `/message/delete_conversation/<conversation_id>` | login | Delete a conversation |
| GET | `/message/api/me/context` | login | Current user's chat context |
| GET | `/message/api/conversations/<user_id>` | login | Conversations for a user (owner or admin only) |
| POST | `/message/set_active_conversation` | login | Set the active conversation |
| GET | `/message/get_current_conversation` | login | Current conversation |
| GET | `/message/get_historical_conversation` | login | Historical conversation |
| POST | `/message/end_conversation` | login | End a conversation |
| GET | `/message/get_conversation` | login | Fetch a conversation |
| GET | `/message/conversation_history` | - | Conversation history |
| GET | `/message/view_conversation/<conversation_id>` | login | View one conversation |

## 3. Admin (`/api/admin`, all `admin`)

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/api/admin/dashboard` | Aggregated stats |
| GET | `/api/admin/logs` | System logs |
| GET | `/api/admin/export/transactions` | Export duck transactions |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/pending_users` | Users awaiting approval |
| POST | `/api/admin/approve_user/<user_id>` | Approve a user |
| POST | `/api/admin/reject_user/<user_id>` | Reject a user |
| POST | `/api/admin/create_user` | Create a user |
| POST | `/api/admin/remove_user` | Remove a user |
| POST | `/api/admin/reset_password` | Reset a user's password |
| POST | `/api/admin/adjust_ducks` | Adjust a user's duck balance |
| GET | `/api/admin/pending_trades` | Pending duck trades |
| POST | `/api/admin/trade_action` | Approve or reject a trade |
| GET | `/api/admin/manage-projects` | Projects for review |
| POST | `/api/admin/handle-project-review/<project_id>` | Approve or reject a project |
| POST | `/api/admin/toggle-ai` | AI teacher flag (AI teacher is currently off) |
| POST | `/api/admin/toggle-message-sending` | Global message-sending flag |
| POST | `/api/admin/update_duck_multiplier` | Global reward multiplier |
| POST | `/api/admin/add-banned-word` | Moderation word list |
| GET | `/api/admin/documents` | List documents |
| GET | `/api/admin/documents/stats` | Document stats |
| GET | `/api/admin/documents/<category>/<filename>/view` | View a document |
| GET | `/api/admin/documents/<category>/<filename>/download` | Download a document |
| POST | `/api/admin/delete-document` | Delete a document |
| POST | `/api/admin/advanced/purge-history` | Purge chat history |
| GET | `/api/admin/advanced/stats-extended` | Extended stats |
| GET, POST | `/api/admin/crud/<resource>` | React-Admin list / create |
| GET, PUT, DELETE | `/api/admin/crud/<resource>/<id>` | React-Admin read / update / delete |
| GET | `/api/admin/crud/schema/<resource>` | Resource schema |

The former `/api/admin/verify_password`, `/api/admin/set_username` and `/api/admin/stats`
endpoints no longer exist.

## 4. Achievements and certificates

Two blueprints expose the same functions: `/achievements/*` (`achievement_routes.py`) and
`/api/achievements/*` (`api_achievements.py`). The React app uses `/api/achievements/*`.

| Method | Path (under `/api/achievements`) | Notes |
| :--- | :--- | :--- |
| GET | `/all` | All achievements |
| GET | `/check` | Evaluate achievements for the current user |
| POST | `/add` | Add an achievement (admin) |
| POST | `/submit_certificate` | Submit a certificate |
| GET | `/view_certificate/<cert_id>` | View a certificate (public by design) |
| GET | `/download_certificate/<cert_id>` | Download a certificate (public by design) |
| GET | `/admin/certificates` | Certificates for review (admin) |
| POST | `/admin/certificates/reviewed/<cert_id>` | Mark reviewed (admin) |

The `/achievements/*` copy additionally has `/`, `/view` and GET+POST on `add` and `submit_certificate`.

## 5. Challenges, ducks, notes, uploads

| Method | Path | Auth | Notes |
| :--- | :--- | :--- | :--- |
| GET, POST | `/challenge/submit` | - (csrf-exempt, CORS for codecombat.com / ozaria.com) | Challenge claim (honor system by design) |
| GET | `/duck_trade/` | - | Trade page data |
| GET | `/duck_trade/bit_shift` | - | Bit-shift exercise |
| POST | `/duck_trade/submit_trade` | - | Submit a duck trade request |
| POST | `/notes/upload` | - | Upload a note |
| GET | `/notes/view/<filename>` | - | Serve a note file |
| POST | `/notes/delete/<note_id>` | - | Delete a note |
| POST | `/upload/upload_file` | - | File upload |
| GET | `/upload/uploads/<filename>` | - | Serve an uploaded file |

## 6. Session, server, AI, webhooks

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/api/session/heartbeat` | Presence heartbeat |
| GET | `/server/health` | Health check (public; used by `deploy.sh` and Route 53) |
| GET | `/server/ip` | Server IP |
| POST | `/ai/get_ai_response` | AI teacher query (feature is currently off) |
| POST | `/api/webhooks/youtube` | YouTube callback |
| POST | `/api/webhooks/transcribe` | Transcription callback |

## 7. Development only

`GET /dev-login` (browser) and `GET, POST /api/dev-login` (agents) are registered only when
`FLASK_ENV` is not `production`. The browser page template is `frontend/templates/dev_login.html`.

## 8. SPA and static routes

`GET /` and `GET /<path>` are handled by `general_routes.py`, which returns the React
`index.html` via `application/utilities/spa.py` (production: `frontend/dist`). In development the
React app runs on the Vite dev server (port 5173), which proxies API paths to Flask on port 8000.
`/static/lib/*` and `/static/sounds/*` serve Vite public assets.

## 9. Socket.IO events (`backend/application/socket_events.py`)

| Direction | Event | Payload / behaviour |
| :--- | :--- | :--- |
| client to server | `connect` | Rejected unless the session is logged in; the server joins the user to their `classroom:<id>` rooms (and `admin` for admins) |
| client to server | `disconnect` | Marks the user offline when their last socket closes |
| client to server | `send_message` | `{ conversation_id, content }`. The only way to send a chat message; validated by `services/message_service.validate_and_save_message` |
| server to room | `message_received` | Saved message payload, emitted only to the message's `classroom:<id>` room |
| server to sender | `message_error` | `{ error, conversation_id? }` when a message is rejected |
| server to all | `user_status_change` | `{ user_id, is_online }` |
| server to user | `classroom_enrolled` | `{ classroom, user_id }`, sent to the `user:<id>` room on enrollment |

There is no `typing` event.
