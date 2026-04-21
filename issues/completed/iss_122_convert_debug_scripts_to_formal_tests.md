# Issue: Convert Debug Scripts to Formal Tests

**ID**: iss_122
**Status**: OPEN
**Priority**: MEDIUM
**Category**: QUALITY_ASSURANCE

## Description
During a dead-code audit, several root-level and backend-level debug scripts were identified. These scripts contain valuable logic for testing authentication, API responses, and file uploads (specifically profile pictures), but they currently exist as one-off files outside of the formal test suite.

These scripts should be reviewed and their logic integrated into the standard `pytest` suite in `backend/tests/`.

## Affected Logic / Scripts to Review
- `test_login.py` & `test_signup.py`: Auth flow verification.
- `backend/test_pfp_upload.py`: Profile picture upload and processing pipeline.
- `backend/check_api_data.py`: Structure validation for API responses.
- `backend/check_conv_details.py`: Messaging and conversation state validation.
- `backend/fix_missing_pfps.py`: Can be converted into an automated integrity check or a test that verifies PFP path consistency.

## Acceptance Criteria
- [ ] Logic from identified scripts is moved to `backend/tests/`.
- [ ] Tests are integrated with the existing Pytest configuration.
- [ ] Tests cover both success and failure cases (e.g., unauthorized access, invalid file types).
- [ ] The original one-off scripts can be safely deleted if not already removed.

## References
- Follow-up from dead code removal pass on April 19, 2026.
- [backend_design.md](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/backend_design.md#L121-L127) - Testing Strategy section.
