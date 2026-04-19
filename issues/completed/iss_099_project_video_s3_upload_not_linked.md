# Project Video Uploads (S3) Not Linked to Projects

## Description
When a student uploads a video file (MP4, etc.) for a project, the file is successfully uploaded to the S3 bucket, but it is not linked back to the project. The `video_url` field in the database remains empty, so the video never appears on the profile page.

## Symptoms
- Video uploads appear to succeed during project creation/edit.
- No video player appears in the project modal.
- `video_url` in the database is null for projects that had a file upload.

## Resolution
This issue was resolved alongside #96.
1. **Backend**: `handle_video_s3_upload` in `backend/application/routes/user_routes.py` now updates the `Project.video_url` field with the public S3 URL after a successful upload.
2. **Frontend**: The `Profile` component in `frontend/src/pages/Profile/index.jsx` now detects if a `video_url` is a direct video link (via `getYoutubeEmbedUrl` returning null) and renders a `<video>` tag instead of an `<iframe>`.

## Changed Files
- [user_routes.py](file:///c:/Users/Ben/AntiGravity/classroom-chat/backend/application/routes/user_routes.py)
- [Profile/index.jsx](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/Profile/index.jsx)

## Verification Status
- [x] S3 video rendering and backend linkage verified via code audit and project state simulation.
