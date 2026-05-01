---
name: Login Automation
description: Authenticate agents in the application. Uses /dev-login by default; standard credentials are kept for explicit login/signup feature testing only.
---
# Login Automation Skill

> [!IMPORTANT]
> **DEFAULT PATH**: Navigate to `http://localhost:8000/dev-login?role=admin` (backend port).
> This is a direct GET request — no form, no password, no typing required.
> Use this for **all normal agent tasks**.

> [!CAUTION]
> **STRICT RULES — READ BEFORE ACTING**
> - Do NOT attempt to guess passwords or use combinations like `admin/1234`.
> - Do NOT try the standard `/login` or `/signup` flows unless the task explicitly asks you to test those features.
> - Do NOT invent alternate credentials.
> - If `/dev-login` fails, **stop and report to the user**. Do not try workarounds.

---

## Path A — `/dev-login` (Default for All Normal Tasks)

### Step 1 — Authenticate

Navigate `browser_subagent` to:
```
http://localhost:8000/dev-login?role=admin
```
For a student session use:
```
http://localhost:8000/dev-login?role=student
```

You will see a JSON response in the browser:
```json
{ "success": true, "user": { "username": "ben", ... }, "role": "admin" }
```
This confirms the session cookie has been set.

> [!NOTE]
> **Port 8000** is the Flask backend. Do not confuse this with port 5173 (the React dev server).
> The route accepts GET requests — just navigate to it, no form submission needed.

### Step 2 — Use the App

Navigate to `http://localhost:5173/` and verify the chat or dashboard loads (not the login page). The session from step 1 is shared between ports.

**Available roles:**

| Role | Maps to Username |
| :--- | :--- |
| `admin` | `ben` |
| `student` | `blossomstudent01` |

---

## Path B — Standard `/login` (For Login/Signup Feature Testing Only)

Use **only** when the task goal is to verify that the login or signup UI works correctly.

| Field | Value |
| :--- | :--- |
| **URL** | `http://localhost:5173/login` |
| **Username Field** | `#username` |
| **Password Field** | `#password` |
| **Submit Button** | `#login-submit-btn` |

**Credentials:**

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `ben` | `rK@76E6P7z7E` |
| **Student** | `blossomstudent01` | `Bls01` |

> [!NOTE]
> If the login field selectors change, update this skill accordingly.
