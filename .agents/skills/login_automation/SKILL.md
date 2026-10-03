---
name: Login Automation
description: Authenticate agents in the application. Uses /dev-login by default; standard credentials are kept for explicit login/signup feature testing only.
---
# Login Automation Skill

> [!IMPORTANT]
> The login procedure (the default `/dev-login` path, the rules against guessing or inventing credentials, and when the standard `/login` form is allowed) lives in the [`login` skill](../login/SKILL.md). This skill only holds the reference data that skill points to.

## `/dev-login` Roles

| Role | Maps to Username |
| :--- | :--- |
| `admin` | `ben` |
| `student` | `blossomstudent01` |

---

## Standard `/login` Form (For Login/Signup Feature Testing Only)

Use **only** when the task goal is to verify that the login or signup UI works correctly (Path B of the `login` skill).

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
