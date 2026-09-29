# Classroom Chat: Next Steps Prompts

The original prompts in this file covered the Jinja2 to React migration (component migration,
Socket.IO client, FormData uploads, production build and deployment). All four are complete and were
removed, because following them now would cause regressions:

- The React pages and `useChatSocket` hook exist; chat messages are sent only via the Socket.IO
  `send_message` event (errors come back as `message_error`).
- Image uploads use `/user/api/profile-picture` and `/user/api/project-image` with FormData.
- Flask serves `frontend/dist/index.html` in production via `application/utilities/spa.py`
  (`TEMPLATE_FOLDER` / `STATIC_FOLDER` in `config.py`). CORS is an explicit origin list, not `*`.
- `deploy.sh` intentionally does not build the frontend; GitHub Actions builds it (`deploy.yml`,
  `deploy-frontend.yml`).

The prompts below are the remaining valid follow-ups. Check the current code and the open GitHub
Issues (`gh issue list --state open`) before starting, and file new work as GitHub Issues.

---

## 1. Re-enable the AI teacher as a chatbot

**Task:** The AI teacher is currently switched off (`Configuration.ai_teacher_enabled`, `/ai/get_ai_response`,
`/api/admin/toggle-ai`, code in `backend/application/ai/`). Re-introduce it as a chatbot in the React UI.

**Key Files to Review:**
- `backend/application/ai/`, `backend/application/routes/ai_routes.py`
- `backend/application/routes/admin/config_routes.py` (toggle)
- `backend/application/socket_events.py` and `services/message_service.py` (the single message path)
- `frontend/src/hooks/useChatSocket.js`

---

## 2. Confirm the production Gunicorn worker class

**Task:** The app runs Flask-SocketIO in gevent mode. Confirm on the EC2 host which worker class the
`gunicorn-benmega` systemd unit uses, and update `docs/infrastructure_and_devops.md` (and the unit) if it
is not a gevent-capable worker.

**Key Files to Review:**
- `docs/infrastructure_and_devops.md` (section 4)
- `backend/main.py`, `backend/requirements.txt`

---

## 3. Move remaining EC2-served assets behind the S3/CloudFront setup

**Task:** The frontend is deployed to S3 + CloudFront (`.github/workflows/deploy-frontend.yml`), but some
assets (for example user certificates and uploads) are still served by the EC2 Flask backend. Decide
which should move and how cross-origin cookies and CORS behave between `blossom.benmega.com` and
`api-blossom.benmega.com`.

**Key Files to Review:**
- `.github/workflows/deploy-frontend.yml`
- `backend/application/__init__.py` (CORS setup), `backend/application/config.py`
- `backend/application/routes/api_achievements.py`, `upload_routes.py`, `user_routes.py`
