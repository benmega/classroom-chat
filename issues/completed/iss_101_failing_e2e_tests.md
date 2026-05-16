---
title: "Fix failing End-to-End Playwright Tests"
status: "open"
priority: "high"
labels: ["frontend", "e2e-tests", "bug"]
---

# Issue: End-to-End Playwright Tests are failing

## Description
The End-to-End (E2E) tests located in `frontend/tests-e2e/auth.spec.js` and `frontend/tests-e2e/navigation.spec.js` are currently failing. When running `npx playwright test`, all 4 tests fail with the following error:

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
```

This indicates that the frontend development server must be running before the tests are executed, or that playwright needs to be configured with a `webServer` option to start the server automatically.

## Failing Tests
- `[chromium] › tests-e2e\auth.spec.js:17:3 › Authentication Flow › should log in successfully with valid credentials`
- `[chromium] › tests-e2e\auth.spec.js:39:3 › Authentication Flow › should show error on invalid credentials`
- `[chromium] › tests-e2e\navigation.spec.js:22:3 › Navigation › should navigate to profile from dashboard`
- `[chromium] › tests-e2e\navigation.spec.js:28:3 › Navigation › should navigate to bit-shift`

## Proposed Fix
1. Update `playwright.config.js` to include a `webServer` configuration block that starts the frontend development server before running tests.
2. Alternatively, ensure the backend and frontend are started automatically before the E2E test suite runs.
