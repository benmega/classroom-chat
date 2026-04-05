# ISSUE-002: Slow Navigation Overlays

## Status: Open
## Priority: Medium
## Category: UX / Performance

### Description
Every page transition in the SPA triggers a "Preparing your workspace..." or "Loading..." overlay that persists for several seconds. This makes the application feel slow and non-responsive despite being a single-page application.

### Steps to Reproduce
1. Log in.
2. Click on "Profile" in the navigation.
3. Observe the loading overlay.
4. Click on "Chat" and observe the overlay again.

### Expected Behavior
Navigation should be nearly instantaneous or show a subtle progress bar if data fetching is required. Full-screen blocking overlays should be avoided for simple route changes.

### Actual Behavior
Heavy overlays block the UI for extended periods during internal navigation.
