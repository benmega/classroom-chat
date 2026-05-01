# ISS-012: Default Admin Password Is `1234` and Default Secret Key Is Hardcoded

**Type:** Security  
**Severity:** Critical  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

The `config.py` file contains two critical security misconfigurations that are live defaults:

1. **`ADMIN_PASSWORD = "1234"`** — The fallback admin password (used when `ADMIN_PASSWORD` env var is not set) is trivially guessable.
2. **`SECRET_KEY = "your-default-secret-key"`** — Flask uses the secret key to sign session cookies. Using a predictable default allows anyone to forge arbitrary session cookies, effectively bypassing all authentication.

---

## Affected File

`backend/application/config.py`, lines 29 and 37:
```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-default-secret-key")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "1234")
```

---

## Impact

**SECRET_KEY = "your-default-secret-key"**:
- Anyone who knows the default secret key (it's in the public codebase) can craft a valid Flask session cookie, setting `session["user"]` to any user ID.
- This bypasses all `@require_login` guards and grants full access to any account, including admin accounts.
- This is a **critical** vulnerability if the app is ever deployed without this env var set.

**ADMIN_PASSWORD = "1234"**:
- The admin panel and admin password verification route (`/admin/verify_password`) use this fallback.
- An attacker can reset any user's password, adjust duck balances, or remove users by sending `password=1234` to `/admin/verify_password`.

---

## Steps to Reproduce

1. Deploy or run the app without setting the `SECRET_KEY` environment variable.
2. Use `flask-unsign` or equivalent to sign a session cookie with `{"user": 1}` and the known secret key.
3. Access any protected route as user ID 1 (typically the admin).

---

## Recommended Fix

**Raise an error at startup** if the secret key or admin password is using the insecure default:
```python
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Run `python generate_keys.py` and set the key before starting the application."
    )
```

Alternatively, auto-generate a random key on first run and persist it (but this requires a stable storage location). At minimum, the defaults must be removed.
