# Backend Technical Design Document - Classroom Chat

This document outlines the architectural design, technology stack, and implementation patterns of the Classroom Chat backend.

## 1. Overview
The Classroom Chat backend is a robust Python application built using the Flask ecosystem. It serves as a central API hub, managing authentication, real-time messaging, database persistence, and system-wide configurations. It is designed to be extensible, secure, and capable of handling complex business logic through a service-oriented approach.

### Core Technology Stack
- **Framework**: [Flask 3.1.1](https://flask.palletsprojects.com/)
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) & [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)
- **Real-time**: [Flask-SocketIO](https://flask-socketio.readthedocs.io/) (async mode: [gevent](https://www.gevent.org/), with `gevent-websocket`)
- **Security**: [Flask-Limiter](https://flask-limiter.readthedocs.io/), [Flask-WTF (CSRF)](https://flask-wtf.readthedocs.io/), [Cryptography](https://cryptography.io/)
- **Scheduling**: [Flask-APScheduler](https://github.com/viniciuschiele/flask-apscheduler)
- **AI Integration**: [OpenAI Python Library](https://github.com/openai/openai-python)
- **Admin Interface**: JSON CRUD API under `/api/admin/crud/<resource>` consumed by the React-Admin based admin UI (Flask-Admin is not used)
- **Environment**: [python-dotenv](https://github.com/theskumar/python-dotenv)

---

## 2. Architecture

### Application Factory Pattern
The app uses the **Application Factory** pattern (`create_app`) located in `application/__init__.py`. This allows for dynamic configuration based on the environment (`development`, `testing`, `production`) and facilitates unit testing.

### Modular Routing (Blueprints)
API endpoints are structured into logical modules using **Flask Blueprints**. This ensures a separation of concerns and maintainable code:
- **`user`** (`/user`): Profile management, auth status, and user-specific actions.
- **`admin`** (`/api/admin`): System management, duck balance adjustments, CRUD, documents and advanced controls.
- **`message`** (`/message`): Conversation management and history (messages are sent via Socket.IO, not HTTP).
- **`ai`** (`/ai`): Integration with AI teaching logic (the AI teacher is currently off).
- **`achievements`** (`/achievements`) and **`achievements_api`** (`/api/achievements`): Badges, milestones and certificates.
- **`upload`** (`/upload`) and **`notes`** (`/notes`): File uploads and notes.
- **`duck_trade`** (`/duck_trade`): Duck trading and the bit-shift exercise.
- **`challenge`** (`/challenge`): Challenge submission (honor system, CORS for codecombat.com / ozaria.com).
- **`session`** (`/api/session`): Presence heartbeat.
- **`webhooks_api`** (`/api/webhooks`): YouTube and transcription callbacks.
- **`server_info`** (`/server`): Health check and server IP.
- **`general`**: Serves the React `index.html` and Vite public assets.
- **`dev_login`**: `/dev-login` and `/api/dev-login`, registered only outside production.

See [api_reference.md](api_reference.md) for every route.

### Proxy & WSGI Support
- **ProxyFix**: Configured to trust headers when running behind a reverse proxy (like Nginx).
- **CORS**: Robustly configured via `flask-cors` to support specific origins and credential sharing (crucial for local development with Vite).

---

## 3. Database & Models

### Relational Mapping
The system uses **SQLite** (`prod_users.db` in production) via the SQLAlchemy ORM. The relational schema is extensive, with core entities including:
- **Users**: Core entity with password hashing (Werkzeug) and relationship links to projects, achievements, and messages.
- **Conversations & Messages**: Real-time messaging entities with participant tracking.
- **Projects & Challenges**: Student submission workflows.
- **Achievements & DuckTrades**: Gamification elements involving virtual currency (Ducks).

### Initialization Strategy
- **`setup_models()`**: A centralized helper to register all models during app startup.
- **Schema creation**: Outside production the app factory runs `db.create_all()` and seeds defaults. In production `create_all` is skipped; the schema is managed by Alembic (`flask db upgrade`, run by `deploy.sh`). See [database_schema.md](database_schema.md).

---

### Session Management & Authentication
The backend implements a custom **Session-based Authentication** system:
- **`require_login` Decorator**: A central security decorator (`application/decorators/login_required.py`) used to protect API routes. It returns a `401 Unauthorized` response for JSON requests or redirects to the login page for browser requests if no session is found.
- **`before_request` Hook**: Automatically loads the logged-in user from the session into Flask's `g` object for easy access across the application.
- **CSRF Protection**: Enabled via `Flask-WTF` in production; disabled in the Development and Testing configs. Some routes are explicitly `csrf.exempt` (login, signup and `/challenge/submit`).
- **Secure Sessions**: Permanent sessions with a strictly defined timeout (**10 hours**) and cookie settings configured in `config.py` to minimize disruptive logouts during class.

### Rate Limiting
**Flask-Limiter** is used to prevent abuse and brute-force attacks:
- **Default Limits**: 50/sec, 500/min, 20000/day.
- **Error Handling**: A custom handler returns a JSON response with a "retry-after" message when limits are hit.


---

## 5. Real-time Communication

Real-time features are powered by **Socket.io**.
- **`socket_events.py`**: Contains centralized event handlers for chat messages, user status updates, and notification broadcasts.
- **Async Mode**: `gevent` (`SOCKETIO_ASYNC_MODE`, see `config.py` and `main.py`).
- **Sending messages**: The client emits `send_message`; the handler calls `services/message_service.validate_and_save_message` and emits `message_received` to the classroom room, or `message_error` to the sender. There is no HTTP send route.
- **Other events**: `user_status_change`, `classroom_enrolled`.
- **Room Management**: Conversations are isolated into specific socket rooms to ensure broadcast privacy.

---

## 6. Background Tasks & AI

### 6.1 Task Scheduling
**Flask-APScheduler** handles periodic system tasks:
- **Project Maintenance**: Automatic cleanup or status updates.
- **System Logs**: Periodic rotation or flushing of temporary session data.

### 6.2 AI Service
The backend integrates with **OpenAI** to provide an "AI Teacher" experience:
- **`application/ai/`**: Contains the logic for processing AI-assisted conversations and validating AI-generated feedback.
- **Global Toggle**: Controlled via the admin panel through the system configuration model.

---

## 7. Directory Structure

```text
backend/
├── application/       # Core app logic
│   ├── ai/            # AI teacher services
│   ├── decorators/    # Custom Flask decorators
│   ├── models/        # SQLAlchemy model definitions
│   ├── routes/        # API Blueprints
│   ├── services/      # Business logic and external wrappers
│   ├── utilities/     # Internal helpers, formatting, spa.py (serves the React index.html)
│   ├── extensions.py  # Shared Flask extension instances
│   ├── config.py      # Environment configs
│   ├── constants.py
│   ├── socket_events.py  # Socket.IO handlers
│   └── tasks.py       # Scheduled jobs
├── infrastructure/    # Lambda transcriber and related deployment files
├── migrations/        # Alembic migrations
├── tools/             # One-off maintenance scripts
├── tests/             # pytest suite
├── main.py            # Entry point for the Flask application
└── requirements.txt   # Backend dependencies
```

---

## 9. Testing Strategy
- **Tool**: [Pytest](https://pytest.org/) with [pytest-flask](https://github.com/pytest-dev/pytest-flask).
- **Scope**:
    - **Unit Tests**: Coverage for individual models and utility functions.
    - **Integration Tests**: Verification of API endpoints via the Flask test client.
    - **Task Tests**: Validating APScheduler jobs and AI service wrappers.
