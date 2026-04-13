# Infrastructure and DevOps - Classroom Chat

This document details the configuration, deployment, and automation infrastructure supporting the Classroom Chat ecosystem.

## 1. Environment Management
The project uses environment variables (`.env`) to manage configurations across different stages of development.
- **Frontend**: Configured via `VITE_API_URL` and `import.meta.env`.
- **Backend**: Managed via `python-dotenv` and separate config classes (`DevelopmentConfig`, `ProductionConfig`).

---

## 2. CI/CD (GitHub Actions)
Located in `.github/workflows/`, our automation suite handles the lifecycle of the code:

### 2.1 Quality Control
- **`lint.yml`**: Validates code style using ESLint for React and Ruff/Bland for Python.
- **`tests.yml`**: Orchestrates the execution of Vitest and Pytest suites.

### 2.2 Operational Pipelines
- **`ai-planner.yml` / `ai-coder.yml`**: Advanced workflows that leverage LLMs for high-level project planning and automated code generation.
- **`deploy.yml`**: triggers the deployment process when changes are merged into the main branch.

---

## 3. Deployment Strategy
- **Entry point**: `deploy.sh` script in the root directory.
- **Backend Deployment**:
    - **WSGI Server**: [Gunicorn](https://gunicorn.org/) is used for the production app server.
    - **Reverse Proxy**: Typically deployed behind Nginx or Apache to handle SSL termination and static file serving.
    - **Process Management**: Recommended usage of `systemd` or `PM2` for maintaining backend uptime.
- **Frontend Deployment**:
    - Build artifact generated via `npm run build`.
    - Served as static files, ideally through a CDN or the same reverse proxy hosting the backend.

---

## 4. Reverse Proxy Configuration
The application is designed to be proxy-aware:
- **`ProxyFix`**: Enabled in the Flask app factory to correctly interpret `X-Forwarded-For` and `X-Forwarded-Proto` headers, ensuring correct IP resolution and HTTPS redirects.

---

## 5. Security Infrastructure
- **Base CSP**: Security headers are managed at the reverse proxy level.
- **Encryption**: RSA keys handled in the `license/` directory for system validation.
- **Real-time Isolation**: Socket.io configured with strictly allowed origins to prevent cross-site websocket hijacking.
