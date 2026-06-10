# Image Upload Max Size Label Mismatch

## Description
In `frontend/src/components/common/ImageUpload.jsx`, the default `secondaryLabel` indicates a maximum file size of `5MB`, but the actual validation logic permits file sizes up to `10MB` and displays an error saying "File is too large (max 10MB)" when the threshold is exceeded. This inconsistency causes user confusion.

## Location
- `frontend/src/components/common/ImageUpload.jsx` (Lines 23, 39, 40)

## Proposed Fix
Align the text label and validation logic so they both reflect the same maximum size limit (either 5MB or 10MB). 

## Root Cause/Resolution
The `secondaryLabel` default parameter was hardcoded to '5MB', while the validation logic enforced '10MB'. The default `secondaryLabel` in `frontend/src/components/common/ImageUpload.jsx` was updated to '(max. 10MB)' to accurately reflect the validation logic.
