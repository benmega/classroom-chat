# ISS-013: Certificate File Upload Saves to CWD `certificates/` Instead of a Configured Upload Folder

**Type:** Reliability / Data Loss  
**Severity:** Medium  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

The certificate submission route in `achievement_routes.py` saves uploaded PDF files to a hardcoded relative path `"certificates/"` — a directory relative to wherever the Flask process was started from, not the configured `UPLOAD_FOLDER`. This is inconsistent with the rest of the app's file handling and will cause file loss on restarts or deployments that change the working directory.

---

## Affected File

`backend/application/routes/achievement_routes.py`, lines 31 and 195–198:
```python
UPLOAD_FOLDER = "certificates"  # Relative path at module level

...
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
filepath = os.path.join(UPLOAD_FOLDER, filename)
file.save(filepath)
```

---

## Impact

- Certificate PDFs end up in an unpredictable location depending on the process working directory.
- On deployment systems (e.g., systemd services, Gunicorn), the CWD may be `/` or the service user's home — not the project root.
- The `view_certificate` and `download_certificate` routes store and serve from `cert.file_path` (the absolute path at save time). If the server restarts with a different CWD, `os.path.abspath(cert.file_path)` will resolve to the wrong location, and the 404 path will trigger.
- Admins reviewing certificates will see "Certificate file not found on the server" errors, making the review workflow non-functional.

---

## Recommended Fix

Replace the hardcoded `UPLOAD_FOLDER` constant with the app's configured `UPLOAD_FOLDER`:
```python
from flask import current_app

...
cert_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "certificates")
os.makedirs(cert_dir, exist_ok=True)
filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
filepath = os.path.join(cert_dir, filename)
file.save(filepath)
```
