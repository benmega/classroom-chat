# ISSUE: Frontend E2E Test Failures

## Status
- **Priority**: Medium
- **Category**: Regression / UI
- **Assignee**: Frontend Developer / QA

## Description
Two Playwright E2E tests are failing: `should navigate to profile from dashboard` and `should navigate to bit-shift`.

## Findings
- **Navigation to Profile**: Fails at `await page.locator('a[href="/profile"]').click();`.
    - Error: `element was detached from the DOM, retrying`.
    - This suggests the page is redirecting or the element is being removed before the click can complete, or the selector is incorrect/ambiguous.
- **Navigation to Bit-Shift**: Also fails during navigation.

## Suggested Resolution
1. Review the navigation logic in the application. Ensure that links are stable.
2. Update the Playwright selectors to be more robust (e.g., using `role` or `test-id` instead of raw `href`).
3. Check if there are unintended redirects (e.g., to `/login`) that interfere with the test flow.

## Root Cause
1. **Ambiguous Selectors**: Multiple elements (in header, dropdown, and sidebar) matched the `a[href="/profile"]` and `a[href="/bit-shift"]` selectors, causing Playwright strict mode violations.
2. **UI Overlays**: The `Tutorial` (spotlight) component was active on first load, intercepting clicks with its overlay.
3. **Hidden Elements**: The profile link was inside a closed dropdown menu on desktop, requiring a toggle click to be visible.
4. **Brittle Mocks**: The E2E tests were sometimes intercepting source files (like `src/api/client.js`) and returning JSON, causing the application to crash.

## Resolution
1. Added `data-testid` attributes to critical navigation links in `Layout.jsx`.
2. Updated `navigation.spec.js` to:
   - Use `page.getByTestId` for robust selection.
   - Disable the tutorial via `localStorage` before running tests.
   - Click the profile toggle before accessing the profile link.
   - Use more specific API mocks that don't intercept source code.
   - Added `expect(...).toBeVisible()` to handle application loading states.

## Changed Files
- `frontend/src/components/Layout/Layout.jsx`
- `frontend/tests-e2e/navigation.spec.js`

## Verification
- Executed `npm run test:e2e` in the `frontend` directory.
- All 4 tests (Navigation and Auth) passed successfully.
