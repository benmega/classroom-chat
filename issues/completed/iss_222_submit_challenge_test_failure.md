---
id: iss_222
title: SubmitChallenge.test.jsx fails due to removed file input
module: frontend
status: completed
severity: high
type: bug
---

# Description
The `npm run test` command reported 5 failures in `SubmitChallenge.test.jsx`, caused by the "Upload Certificate PDF" file input being removed from the application (due to automated certificate generation) while the tests still referenced it.

## Resolution
`SubmitChallenge.test.jsx` had already been updated (in a prior, untracked commit) to test the URL-based certificate flow instead of the removed file input. Verified during a 2026-08-06 pass over the Submit Work page that `npm run test -- --run` reports all 7 tests in `SubmitChallenge.test.jsx` passing, and the full suite (390 tests) is green. Closing as stale — no code change was required, only updating this issue's status.
