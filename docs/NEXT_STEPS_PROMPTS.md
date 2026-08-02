# Classroom Chat: Jinja2 → React Migration (Completed)

This document originally listed prompts for migrating the app from server-rendered Jinja2 templates to a React SPA. That migration is now **complete**:

- The primary UI lives in `frontend/src/` (React 19 + Vite, routed in `frontend/src/App.jsx`).
- Chat and Profile (and every other end-user page) are React components, not Jinja2 templates.
- Real-time chat is wired up via `socket.io-client` (`frontend/src/hooks/useChatSocket.js`) against `backend/application/socket_events.py`.
- File uploads (profile picture, project image, profile wallpaper) go through JSON/FormData endpoints returning the standard `@api_response` envelope — see `backend/application/routes/user_routes.py`.
- Production builds the frontend (`npm run build`) and serves `frontend/dist` from Flask (`ProductionConfig.TEMPLATE_FOLDER`/`STATIC_FOLDER` in `backend/application/config.py`); a catch-all in `general_routes.py` serves `index.html` for client-side routes.
- `deploy.sh` and the GitHub Actions deploy workflows build the frontend as part of every deploy.

## What's left of the old stack, and why
`frontend/templates/` and `frontend/static/` (Jinja2 templates/CSS) are **not deleted**. They're kept solely because `create_app()` registers `frontend/templates` as a Jinja loader fallback so Flask-Admin's built-in "advanced panel" templates (`admin/advanced_panel.html`, `admin/admin_base.html`) still resolve. Do not build new user-facing features here — everything new belongs in `frontend/src/`.

If you're looking for genuinely current priorities or open work, check `issues/` for any tickets not yet moved to `issues/completed/`, or ask the project maintainer — this file is a historical record, not a live roadmap.
