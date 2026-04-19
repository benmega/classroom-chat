# iss_109_digital_notebook_upload_500
**Status**: Closed (Fixed 2026-04-18)
**Priority**: High
**Type**: Bug

## Description
Uploading files to the Digital Notebook results in a server configuration or endpoint issue. This applies to both general file uploads and the camera icon for taking a photo. Both are linking to uploads and failing with a 500 error. The user suspects this might be a dev vs prod environment issue or a routing problem.

## Error Trace
`Failed to load resource: the server responded with a status of 500 (Internal Server Error) from notes/upload line one.`

## Steps to Reproduce
1. Navigate to the Digital Notebook (Notes) section.
2. Attempt to upload a file or click the camera icon to take a photo.
3. Check the network console to observe the 500 Internal Server Error.

## Resolution
- **Root Cause**: The `notes_routes.py` was hardcoded to use AWS S3 for storage. In local development environments where S3 is not configured, the `boto3` client initialization and upload calls would fail, resulting in a 500 Internal Server Error. Additionally, the backend response format did not always match the frontend's expectation (`status: 'success'`).
- **Fix**: 
    - Implemented a local storage fallback in `notes_routes.py` that saves notes to `userData/notes` if AWS credentials are missing.
    - Added a `/notes/view/<filename>` route to serve locally stored notes.
    - Updated the `Note` model's `url` property to dynamically return either an S3 URL or a local URL depending on the filename pattern.
    - Standardized API responses to include `status: 'success'` or `status: 'error'`.
- **Changed Files**:
    - `backend/application/models/note.py`
    - `backend/application/routes/notes_routes.py`
- **Verification**: Verified using a reproduction script (POST to `/notes/upload`) and via the UI on the Profile page. 
- **Evidence**: ![Fixed Digital Notebook](/C:/Users/Ben/.gemini/antigravity/brain/9a51e7de-0dd0-43de-83f5-dbb98385b327/digital_notebook_profile_1776520710665.png)
