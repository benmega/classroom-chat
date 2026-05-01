# Testing and QA - Classroom Chat

This document outlines the holistic testing strategy, quality assurance processes, and tools used across the Classroom Chat project.

## 1. Overview
Classroom Chat employs a multi-layered testing strategy to ensure application stability, prevent regressions, and maintain a premium user experience. This includes unit testing, integration testing, and end-to-end (E2E) testing.

---

## 2. Testing Stack

### 2.1 Backend Testing
- **Framework**: [Pytest](https://pytest.org/)
- **Extensions**: `pytest-flask`, `pytest-socketio`
- **Key Files**:
    - `backend/tests/conftest.py`: Defines fixtures for the app instance, database, and authenticated clients.
    - `backend/tests/app/`: Contains functional and integration tests for various modules (Auth, Admin, Message).
- **Strategy**: 
    - Focused on API endpoint validation (status codes, JSON payloads).
    - Database state verification after operations.
    - Mocking of external services (e.g., OpenAI).

### 2.2 Frontend Testing
- **Framework**: [Vitest](https://vitest.dev/)
- **Utility**: [React Testing Library (RTL)](https://testing-library.com/docs/react-testing-library/intro)
- **Key Coverage**:
    - **Unit Tests**: React hooks (`useAuthStore`), utility functions, and common components.
    - **Component Tests**: Interaction testing for complex UI components (e.g., Modals, Dashboards).
- **Real-time Testing**: Vitest is used to mock Socket.io events and verify component state updates.

### 2.3 E2E Testing (System Tests)
- **Tool**: [Playwright](https://playwright.dev/)
- **Location**: `frontend/tests-e2e/`
- **Scenarios**:
    - **Auth Flow**: Signup -> Login -> Dashboard redirect.
    - **Messaging**: Real-time message exchange between multiple mock users.
    - **Responsiveness**: Visual regression checks across desktop and mobile viewports.

---

## 3. Automation (CI)
Tests are automatically executed on every push and pull request via GitHub Actions.

- **`tests.yml`**: Triggers full test suite (Backend + Frontend).
- **`lint.yml`**: Runs ESLint (frontend) and Ruff (backend) to ensure code style consistency.

---

## 4. UI/UX Bug Auditing
Classroom Chat uses a specialized human-in-the-loop auditing process for UI bugs:
1. **Automated Crawling**: Playwright scripts navigate common user paths.
2. **Visual Audit**: Screenshots are captured for key pages (Profile, Chat, Admin).
3. **Issue Creation**: Visual or functional bugs are documented as Jira-style markdown files in the `issues/` directory for systematic resolution.

---

## 5. Development Quality Workflow
- **Pre-commit Checks**: Developers are encouraged to run `npm run lint` and `pytest` locally.
- **Agentic Assistance**: AI-powered "solve-issue" and "cleanup-code" workflows are used to automate the resolution of technical debt and linting errors identified during QA.
