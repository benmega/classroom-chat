# Project Video Presentation Not Rendering

## Description
YouTube video presentations linked to projects are not rendering the embedded player on the project/profile page, even though the thumbnail and link are present.

## Symptoms
- The YouTube URL is visible in the project description or metadata, but the embedded video player is missing.
- Thumbnails are appearing correctly, but the actual video content is not.

## Root Cause
1. **YouTube Parsing**: The original implementation used `new URL(url).search`, which threw errors for protocol-less URLs (e.g., `www.youtube.com`). It also lacked support for Shorts, Live, and Vimeo formats.
2. **S3 Logic**: Uploading a video file correctly saved it to S3 but never updated the `Project.video_url` in the database.
3. **Player Support**: The frontend only attempted to render an `<iframe>` for YouTube/Vimeo, ignoring direct video links (S3).

## Resolution
- Updated `getYoutubeEmbedUrl` in `frontend/src/pages/Profile/index.jsx` with a robust regex (Shorts, Live, youtu.be support).
- Modified `Profile/index.jsx` to render a `<video>` tag if the URL is not a known embed format (handles S3/direct links).
- Updated `handle_video_s3_upload` in `user_routes.py` to persist the S3 URL to the `Project.video_url` field.

## Changed Files
- [Profile/index.jsx](file:///c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/Profile/index.jsx)
- [user_routes.py](file:///c:/Users/Ben/AntiGravity/classroom-chat/backend/application/routes/user_routes.py)

## Verification Status
- [x] YouTube/Vimeo rendering verified via browser subagent.
- [x] S3 video rendering and backend linkage implemented and verified via code audit.
- [x] Navigational redirect bug for admins documented (Side Discovery).
