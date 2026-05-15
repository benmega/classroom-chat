---
title: "Fix Frontend ESLint Linting Issues"
status: "open"
priority: "medium"
labels: ["frontend", "lint", "tech-debt"]
---

# Issue: Frontend ESLint Errors

## Description
Running `npm run lint` (`eslint .`) in the frontend directory results in 108 problems (106 errors, 2 warnings).

## Summary of Violations
The violations primarily fall into these categories:
- `no-unused-vars`: Variables are defined or imported but never used (e.g., `error`, `Swal`, `Chart`, `e`, `username`).
- `no-undef`: Usage of undeclared global variables, especially third-party libraries not registered in the ESLint environment (e.g., `Swal`, `Chart`, `bootstrap`, `Cropper`, `io`).
- Third-party library linting: A minified library file `frontend/static/lib/cropper.min.js` is being analyzed by ESLint and produces dozens of violations (`no-redeclare`, `no-cond-assign`, `no-undef`, etc.).

## Affected Files (Partial List)
- `src/pages/Admin/PendingUsers.jsx` (unused `error`)
- `src/pages/Auth/Login.jsx` (unused `error`)
- `static/js/admin/admin.js` (`Swal`, `showBootstrapToast` not defined)
- `static/js/admin/duck-stats.js` (`Chart` not defined)
- `static/js/sockets/socketLogic.js` (`io` not defined)
- `static/lib/cropper.min.js` (Multiple minification-related errors)

## Proposed Fix
1. Add `static/lib/cropper.min.js` (and potentially all of `static/lib/`) to `.eslintignore` so ESLint ignores minified third-party libraries.
2. Define global variables in the ESLint configuration (e.g., `globals: { Swal: "readonly", Chart: "readonly", io: "readonly", bootstrap: "readonly" }`) or import them explicitly.
3. Clean up unused variables across React components and legacy static JS files to satisfy `no-unused-vars`.
