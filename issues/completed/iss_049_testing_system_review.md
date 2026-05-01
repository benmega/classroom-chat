---
title: "Testing System Review and Roadmap"
status: "open"
priority: "medium"
labels: ["architectural-review", "testing"]
---

# Issue: Testing System Review and Roadmap

## Current State Analysis

A review of the current `classroom-chat` testing architecture reveals a fragmented setup where the backend has a solid foundation, but the frontend lacks native, automated testing entirely. 

### Backend (Python/Flask)
**Status:** Healthy.
- A robust `.pytest` suite is correctly configured in `backend/pytest.ini`.
- Comprehensive test coverage exists under `backend/tests/app/` across models, database helpers, and API route controllers (`test_user_routes.py`, `test_challenge_routes.py`, etc.).
- Relies on fixtures logically placed in `tests/` to spin up live server instances and inject sample database items efficiently.

### Frontend (React/Vite)
**Status:** Absent / Obsolete.
- `package.json` contains no standard Next.js/React-Vite testing suites (e.g., `vitest`, `jest`, or `@testing-library/react`). No command script like `npm run test` exists.
- The `frontend/tests_front/` directory holds Python-based Playwright test files (`test_frontend.py`, `test_ui_scenarios.py`), but **all tests inside them are entirely commented out.**
- Leaving Python scripts to test a modern React UI inside the frontend project directory creates a disjointed tech stack boundary and complicates running native component tests.

---

## Proposed Roadmap for a Robust Solution

To establish a scalable and robust testing suite for the long term, we should follow this sequential phased approach:

### Step 1: Clean Up Obsolete Testing Artifacts
- **Action:** Delete the `frontend/tests_front/` directory and its commented-out Python scripts. 

### Step 2: Implement Component & Unit Tests (Vitest + React Testing Library)
- **Goal:** Allow fast turnaround unit testing of React components independently.
- **Action:** 
  1. Install modern JS/React test runners in the frontend: 
     ```bash
     npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
     ```
  2. Update `vite.config.js` to define `test` configurations using the `jsdom` environment.
  3. Add a dedicated `test` script in `frontend/package.json`.
  4. Write `.test.jsx` or `.spec.jsx` files next to critical components.

### Step 3: Implement Native End-to-End (E2E) Testing
- **Goal:** Ensure the app handles user workflows seamlessly after compilation.
- **Action:**
  1. In the project root, initialize an official NodeJS-based Playwright or Cypress framework to act as the primary E2E testing boundary interface.
  2. Map out critical user journeys (e.g., student submission, user login, admin panel interaction) into integration tests that boot both backend + frontend services automatically before execution.

### Step 4: Integrate CI/CD (GitHub Actions)
- **Goal:** Enforce testing compliance before merges.
- **Action:** 
  1. Establish `.github/workflows/tests.yml`.
  2. Have CI natively invoke both `pytest` for the Python layer and `npm run test` for the React components layer.
