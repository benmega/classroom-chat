---
title: "Integrate CI/CD (GitHub Actions)"
status: "open"
priority: "medium"
labels: ["testing", "devops"]
---

# Issue: Integrate CI/CD (GitHub Actions)

## Context
A testing foundation for both backend (Pytest) and frontend (Vitest) is now in place. We need to enforce testing compliance before merges.

## Goal
Establish a GitHub Actions workflow to run the full test suite automatically.

## Actions
1. Establish `.github/workflows/tests.yml`.
2. Configure the workflow to natively invoke:
   - `pytest` for the Python layer (backend).
   - `npm run test` for the React components layer (frontend/Vitest).
3. (Optional) Integrate E2E tests once implemented.
4. Set up branch protection rules or status checks to require these tests to pass before merging.
