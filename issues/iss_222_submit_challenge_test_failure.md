---
id: iss_222
title: SubmitChallenge.test.jsx fails due to removed file input
module: frontend
status: open
severity: high
type: bug
---

# Description
The `npm run test` command reports 5 failures in `SubmitChallenge.test.jsx`. This is caused by the "Upload Certificate PDF" file input being recently removed from the application (due to automated certificate generation), but the tests were not updated to reflect this change.

# Steps to Reproduce
1. Run `cd frontend && npm run test`
2. Observe 5 test failures related to `SubmitChallenge.test.jsx`.

# Expected Behavior
The tests should pass or be updated to omit the checks for the removed "Upload Certificate PDF" file input.

# Actual Behavior
Tests fail as they are still looking for the removed file input.
