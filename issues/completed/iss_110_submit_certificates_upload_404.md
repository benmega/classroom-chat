# iss_110_submit_certificates_upload_404
**Status**: Open
**Priority**: High
**Type**: Bug

## Description
Submitting a completion certificate through the "Submit Certificates" route fails with a 404 Not Found error, implying the routes are unhooked or improperly named in the backend.

## Error Trace
- `Failed to load resources: the server responded with a status of 404 (Not Found)`
- `Upload error, Axios error, request failed with status code 404. On line 88 and line 67.`

## Notes
- Functional links or references might be available in the PyTest suite.

## Steps to Reproduce
1. Navigate to the Submit Certificates route.
2. Attempt to upload/submit a certificate.
3. Observe the 404 request failure.
