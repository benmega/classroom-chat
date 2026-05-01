# ISS-010: Module-Level S3 Client Initialization Crashes App on Boot Without AWS Credentials

**Type:** Reliability / Availability  
**Severity:** High  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

`user_routes.py` initializes a `boto3` S3 client at **module load time** (lines 29–34), outside any function or guard. If `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` environment variables are missing, `boto3` can still initialize (since it uses lazy credential resolution), but any call to `s3_client.upload_fileobj()` will throw a `NoCredentialsError` at runtime that is **not caught** by the surrounding `try/except`.

Furthermore, the video upload failure (`handle_video_s3_upload`) is **silently swallowed** — the function returns `False`, but the route does not communicate this failure to the user. The project is still saved (with no video URL), and the user receives a generic "Project created successfully!" message with no indication the video upload failed.

---

## Affected Files

`backend/application/routes/user_routes.py`:
- Lines 29–34: Module-level S3 client instantiation
- Lines 306–309: Video upload called without error handling or user feedback
- Lines 369–372: Same issue in `edit_project`
- Lines 646–689: `handle_video_s3_upload` catches `Exception` but only prints to stdout

---

## Steps to Reproduce

1. Set up the app without AWS credentials.
2. Try to create a project with a video file attached.
3. The project is saved, but the video URL is never set. The user sees "Project created successfully!" with no video.

---

## Impact

- **Data loss**: Students submit project videos that silently fail to upload. They have no way of knowing unless they re-open the project.
- In environments where S3 is unavailable (dev, offline), any video-attached project submission will silently produce a broken project.
- `print()` is used for critical upload errors instead of proper logging, meaning in production these errors are invisible in log aggregators.

---

## Recommended Fix

1. Move S3 client initialization into a lazy function (following the pattern already established in `notes_routes.py`).
2. Return meaningful error responses when video upload fails:
```python
if "project_video" in request.files:
    video_file = request.files["project_video"]
    if video_file.filename != "":
        video_url = handle_video_s3_upload(video_file, user_obj, name, project_id=new_proj.id)
        if not video_url:
            # Return partial success with a warning
            return {
                "message": "Project created, but video upload failed. Please try re-uploading.",
                "project_id": new_proj.id,
                "video_upload_failed": True
            }, 207
```
3. Replace all `print()` calls in `handle_video_s3_upload` with `current_app.logger.error()`.
