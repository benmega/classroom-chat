# ISSUE-007: Broken Profile and Project Images

## Status: Open
## Priority: Medium
## Category: Data / UI

### Description
User profile avatars and project portfolio images within the Profile page are frequently broken. Projects appear as empty gray boxes with broken image icons. This may be due to incorrect paths in the React frontend or missing files on the server.

### Steps to Reproduce
1. Log in.
2. Navigate to the Profile page.
3. Observe the main profile picture and the "Projects Portfolio" section.

### Expected Behavior
Images should load from `userData` or `static` paths correctly, or show a friendly placeholder image (not a broken browser icon).

### Actual Behavior
Images fail to load (404 errors likely).
