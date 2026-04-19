# iss_116_digital_notebook_upload_fetch_404
**Status**: Completed
**Resolution Date**: 2026-04-19

## Root Cause
The `User.to_dict()` method had a faulty fallback serialization for notes that used the note's numeric ID in the URL (`/notes/view/{n.id}`) instead of its filename. Since the backend `serve_note` route specifically expects a filename (UUID + extension), this resulted in a 404 error when trying to fetch the resource. Additionally, the `Note` model was missing its own `to_dict()` method for robust serialization.

## Changes
- **backend/application/models/note.py**: Added a `to_dict()` method to the `Note` model to handle standardized serialization (including the correct `url` property).
- **backend/application/models/user.py**: Fixed the fallback note serialization in `User.to_dict()` to use `n.filename` instead of `n.id`.

**Priority**: High
**Type**: Functional Bug

## Description
Uploading images to the Digital Notebook section results in a 404 (Not Found) error when trying to load the uploaded resource, even though a success toast notification appears. This suggests a disconnection between the file storage path and the retrieval URL, or a failure to correctly save the file to the intended local/S3 storage.

## Requirements
- Fix the image upload pipeline so that files are correctly stored and accessible.
- If S3 is not available in development, provide a robust local storage fallback (similar to what was discussed in previous conversations).
- Ensure the frontend correctly constructs the URL for fetching the image (preventing 404s).
- Verify that the `Note` model correctly stores the file path.

## Repro Steps
1. Navigate to the Digital Notebook section (on the User Profile page).
2. Click "Upload Note".
3. Select an image and upload it.
4. Observe the "Success" notification.
5. Observe that the new entry in the notebook displays a default background or a broken image link.
6. Check the browser console for `GET ... 404 (Not Found)` errors.

## Verification Results (from initial audit)
- Verified `404 Not Found` for notes images.
- Identified multiple `401 Unauthorized` errors in the console for related API calls (`/user/get_user_id`, `/api/achievements/check`), which may be contributing to state issues.
