# ISSUE: Vitest and Playwright Test Conflict

## Status
- **Priority**: High
- **Category**: Testing Infrastructure
- **Assignee**: QA / DevOps

## Description
The frontend unit test suite (`vitest`) is incorrectly attempting to execute Playwright E2E test files (`.spec.js`). This leads to execution failures due to environment mismatches and library conflicts (multiple versions of `@playwright/test` detected).

## Findings
- `npm run test` (vitest) collects `tests-e2e/navigation.spec.js`.
- Error: `TestTypeImpl._currentSuite node_modules/playwright/lib/common/testType.js:75:13`.
- Warning: "You have two different versions of @playwright/test".

## Suggested Resolution
1. Configure `vitest.config.js` to exclude the `tests-e2e/` directory or files matching `*.spec.js`.
2. Ensure `vitest` only runs unit tests (usually `*.test.js` or in a `__tests__` directory).
3. Investigate the duplicate `@playwright/test` versions using `npm list @playwright/test` and deduplicate if necessary.

## Verification
- Run `npm run test` and verify that no `.spec.js` files are collected.
- All unit tests should pass without environment errors.

## Root Cause
Vitest was not configured to exclude the E2E test directory (`tests-e2e/`), causing it to attempt execution of `.spec.js` files using the `happy-dom` unit testing environment, which is incompatible with Playwright's test runner.

## Resolution
- Modified `frontend/vite.config.js` to add `tests-e2e/**` to the Vitest `exclude` list.
- Verified that `npm run test` now correctly ignores E2E tests and passes all unit tests.

## Changed Files
- `frontend/vite.config.js`
