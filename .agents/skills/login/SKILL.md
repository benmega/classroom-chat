---
name: login
description: Log in to the local app as an admin, student or parent with the dev-login shortcut.
---

> [!IMPORTANT]
> **DEFAULT**: Use the dev-login shortcut for all normal agent authentication tasks.
> Only use the standard `/login` form when the task is **explicitly about testing login or signup behaviour**.

The app must be running: backend `cd backend && python main.py` (port 8000) and frontend `cd frontend && npm run dev` (port 5173). If the database is empty, seed the test users first with `python scripts/seed_e2e_users.py` from `backend/`.

## Roles

| `role` | Account |
| :--- | :--- |
| `admin` | `ben` |
| `student` | `blossomstudent01` |
| `parent` | `test_parent` |

## Path A: dev-login (default)

1. Open the browser at `http://localhost:8000/dev-login?role=<admin|student|parent>`. The backend logs the session in and shows a helper page that forwards to the frontend. (From a script, `POST /api/dev-login` with `{"role": "admin"}` returns JSON; `/api/dev-login?role=...` also works through port 5173.)
2. Open `http://localhost:5173/` and confirm the dashboard or chat is visible, not the login page. Cookies are per host, not per port, so the session from step 1 carries over.

dev-login refuses (403) in a production environment, from a non-localhost caller, or with `DEBUG` off, and reports an error for an unknown role or an account that is not seeded.

### If dev-login fails

**Stop and report the failure to the user.** Do not:
- Try the standard `/login` form
- Try alternative credentials
- Try guessing passwords

> [!CAUTION]
> **NEVER guess passwords. NEVER invent credentials. NEVER fall back to the standard `/login` form unless the task explicitly requires testing that feature.**

## Path B: standard `/login` (login and signup testing only)

Open `http://localhost:5173/login`, fill the username or email field `#usernameOrEmail` and the password field `#password`, and submit with `#login-submit-btn`. Ask the user for credentials; never guess or invent them. Confirm success by the dashboard or a success toast. Signup is at `/signup`.
