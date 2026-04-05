# ISSUE-010: Identity Inconsistency

## Status: Open
## Priority: Low
## Category: UX / Identity

### Description
When logging in as the user "ben", many parts of the UI (header, profile) display the name "Mr. Mega". While this might be a nickname, it can be confusing if the user expects to see their account name or if the "Mega" identity is hardcoded.

### Steps to Reproduce
1. Log in with username "ben".
2. Observe the name displayed in the top-right header and profile page.

### Expected Behavior
The UI should consistently use the user's `nickname` or `username` as stored in the database.

### Actual Behavior
The display name "Mr. Mega" appears to be the default or overridden.
