---
description: Automated Login Procedure
---
> [!IMPORTANT]
> **DEFAULT**: Use `/dev-login` for all normal agent authentication tasks.
> Only use the standard `/login` form when the task is **explicitly about testing login or signup behaviour**.

## When to Use Each Path

| Situation | Path to Use |
| :--- | :--- |
| Agent needs to be authenticated for a task (e.g. UI testing, issue solving) | `/dev-login` — this workflow |
| Task goal is to **verify the login form works correctly** | `/login` — standard flow |
| Task goal is to **verify signup works correctly** | `/signup` — standard flow |

---

## Path A — `/dev-login` (Default for All Agent Tasks)

### Step 1 — Authenticate via the backend shortcut

Use `browser_subagent` to navigate to:
```
http://localhost:8000/dev-login?role=admin
```
or for a student session:
```
http://localhost:8000/dev-login?role=student
```

The backend will authenticate the session and return a JSON response like:
```json
{ "success": true, "user": { ... }, "role": "admin" }
```

> [!NOTE]
> Port **8000** is the Flask backend. This is a direct GET request — no form filling required.

### Step 2 — Navigate to the app

After the `/dev-login` request succeeds, navigate to `http://localhost:5173/` and confirm the chat or dashboard is visible (not the login page). The session cookie from step 1 is shared across both ports.

### If `/dev-login` Fails

**Stop and report the failure to the user.** Do not:
- Try the standard `/login` form
- Try alternative credentials
- Try guessing passwords

> [!CAUTION]
> **NEVER guess passwords. NEVER invent credentials. NEVER fall back to the standard `/login` form unless the task explicitly requires testing that feature.**

---

## Path B — Standard `/login` (Only for Login/Signup Feature Testing)

Use this **only** when the task explicitly asks you to test login or signup behaviour.

1. Refer to the `Login Automation` skill in `c:\Users\Ben\AntiGravity\classroom-chat\.agents\skills\login_automation\SKILL.md` for credentials.
2. Use the `browser_subagent` to navigate to `http://localhost:5173/login`.
3. Fill in the username and password as specified in the skill.
4. Click the submit button (`#login-submit-btn`).
5. Confirm successful login by checking for the presence of the dashboard or a success toast notification.
