# Backend Technical Design Document - Classroom Chat

This document outlines the architectural design, technology stack, and implementation patterns of the Classroom Chat backend.

## 1. Overview
The Classroom Chat backend is a robust Python application built using the Flask ecosystem. It serves as a central API hub, managing authentication, real-time messaging, database persistence, and system-wide configurations. It is designed to be extensible, secure, and capable of handling complex business logic through a service-oriented approach.

### Core Technology Stack
- **Framework**: [Flask 3.1.1](https://flask.palletsprojects.com/)
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) & [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)
- **Real-time**: [Flask-SocketIO](https://flask-socketio.readthedocs.io/) (via [Eventlet](https://eventlet.net/))
- **Security**: [Flask-Limiter](https://flask-limiter.readthedocs.io/), [Flask-WTF (CSRF)](https://flask-wtf.readthedocs.io/), [Cryptography](https://cryptography.io/)
- **Scheduling**: [Flask-APScheduler](https://github.com/viniciuschiele/flask-apscheduler)
- **AI Integration**: [OpenAI Python Library](https://github.com/openai/openai-python)
- **Admin Interface**: [Flask-Admin](https://flask-admin.readthedocs.io/)
- **Environment**: [python-dotenv](https://github.com/theskumar/python-dotenv)

---

## 2. Architecture

### Application Factory Pattern
The app uses the **Application Factory** pattern (`create_app`) located in `application/__init__.py`. This allows for dynamic configuration based on the environment (`development`, `testing`, `production`) and facilitates unit testing.

### Modular Routing (Blueprints)
API endpoints are structured into logical modules using **Flask Blueprints**. This ensures a separation of concerns and maintainable code:
- **`user`**: Profile management, auth status, and user-specific actions.
- **`admin`**: System management, duck balance adjustments, and advanced controls.
- **`message`**: Conversation creation and message history.
- **`ai`**: Integration with AI teaching logic and settings.
- **`achievements`**: Badge and milestone tracking.
- **`upload`**: Handling of profile pictures and static assets.

### Proxy & WSGI Support
- **ProxyFix**: Configured to trust headers when running behind a reverse proxy (like Nginx).
- **CORS**: Robustly configured via `flask-cors` to support specific origins and credential sharing (crucial for local development with Vite).

---

## 3. Database & Models

### Relational Mapping
The system uses **SQLite** (or PostgreSQL in production) via the SQLAlchemy ORM. The relational schema is extensive, with core entities including:
- **Users**: Core entity with password hashing (Werkzeug) and relationship links to projects, achievements, and messages.
- **Conversations & Messages**: Real-time messaging entities with participant tracking.
- **Projects & Challenges**: Student submission workflows.
- **Achievements & DuckTrades**: Gamification elements involving virtual currency (Ducks).

### Initialization Strategy
- **`setup_models()`**: A centralized helper to register all models during app startup.
- **Automatic Schema Creation**: The app factory checks for the existence of core tables and initializes the database (`db.create_all()`) and a default configuration if missing.

---

## 4. Authentication & Security

### Session Management
The backend implements a custom **Session-based Authentication** system:
- **`before_request` Hook**: Automatically loads the logged-in user from the session into Flask's `g` object for easy access across the application.
- **CSRF Protection**: Enabled via `Flask-WTF` to prevent cross-site request forgery.
- **Secure Sessions**: Permanent sessions with a strictly defined timeout (10 minutes by default) and secure cookie settings.

### Rate Limiting
**Flask-Limiter** is used to prevent abuse and brute-force attacks:
- **Default Limits**: 50/sec, 500/min, 20000/day.
- **Error Handling**: A custom handler returns a JSON response with a "retry-after" message when limits are hit.

---

## 5. Real-time Communication

Real-time features are powered by **Socket.io**.
- **`socket_events.py`**: Contains centralized event handlers for chat messages, user status updates, and notification broadcasts.
- **Async Mode**: Configured to use `eventlet` for high-performance concurrent socket connections.
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

## 7. License & Premium System
Classroom Chat includes a custom **Premium License System**:
- **Cryptographic Validation**: Uses RSA public keys to verify digital signatures in `.lic` files.
- **Tiered Features**: Specific features are conditionally enabled based on the `IS_PREMIUM` status derived from the license.

---

## 8. Directory Structure

```text
backend/
├── application/       # Core app logic
│   ├── ai/            # AI teacher services
│   ├── decorators/    # Custom Flask decorators
│   ├── models/        # SQLAlchemy model definitions
│   ├── routes/        # API Blueprints
│   ├── services/      # Business logic and external wrappers
│   ├── static/        # User-uploaded files and static assets
│   ├── utilities/     # Internal helpers and formatting
│   └── extensions.py  # Shared Flask extension instances
├── infrastructure/    # DB connection and deployment configs
├── license/           # Cryptographic keys and license files
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
